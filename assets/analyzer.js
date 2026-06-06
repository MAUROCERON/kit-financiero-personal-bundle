(function (global) {
  function parseCSV(text) {
    const rows = [];
    let row = [];
    let cell = "";
    let inQuotes = false;

    for (let i = 0; i < text.length; i += 1) {
      const char = text[i];
      const next = text[i + 1];

      if (char === '"' && inQuotes && next === '"') {
        cell += '"';
        i += 1;
      } else if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        row.push(cell.trim());
        cell = "";
      } else if ((char === "\n" || char === "\r") && !inQuotes) {
        if (char === "\r" && next === "\n") i += 1;
        row.push(cell.trim());
        if (row.some((value) => value !== "")) rows.push(row);
        row = [];
        cell = "";
      } else {
        cell += char;
      }
    }

    row.push(cell.trim());
    if (row.some((value) => value !== "")) rows.push(row);
    return rows;
  }

  function normalize(text) {
    return String(text || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function money(value) {
    const cleaned = String(value || "")
      .replace(/[$\s]/g, "")
      .replace(/\.(?=\d{3}(,|$))/g, "")
      .replace(",", ".");
    const number = Number.parseFloat(cleaned);
    return Number.isFinite(number) ? number : 0;
  }

  function findIndex(headers, candidates) {
    const normalized = headers.map(normalize);
    return candidates.reduce((found, candidate) => {
      if (found >= 0) return found;
      return normalized.findIndex((header) => header === candidate || header.includes(candidate));
    }, -1);
  }

  function analyzeRows(rows) {
    if (rows.length < 2) {
      return { error: "Pega un CSV con encabezados y al menos una fila." };
    }

    const headers = rows[0];
    const idx = {
      date: findIndex(headers, ["fecha", "date"]),
      type: findIndex(headers, ["tipo", "type"]),
      category: findIndex(headers, ["categoria", "category"]),
      description: findIndex(headers, ["descripcion", "description", "concepto", "merchant"]),
      amount: findIndex(headers, ["monto", "amount", "valor", "importe"]),
    };

    if (idx.amount < 0) {
      return { error: "No encontre una columna de monto/amount/valor." };
    }

    const categories = {};
    const examples = [];
    let income = 0;
    let expense = 0;
    let transactionCount = 0;
    let subscriptionSignals = 0;
    let largestExpense = { amount: 0, description: "" };

    rows.slice(1).forEach((row) => {
      const rawAmount = money(row[idx.amount]);
      if (!rawAmount) return;
      const type = normalize(idx.type >= 0 ? row[idx.type] : "");
      const category = (idx.category >= 0 ? row[idx.category] : "Sin categoria") || "Sin categoria";
      const description = idx.description >= 0 ? row[idx.description] : "";
      const descriptionNorm = normalize(description);
      const isIncome = type.includes("ingreso") || type.includes("income") || (!type && rawAmount > 0);
      const isExpense = type.includes("gasto") || type.includes("expense") || type.includes("debit") || rawAmount < 0 || !isIncome;
      const amount = Math.abs(rawAmount);

      transactionCount += 1;
      if (isIncome && !isExpense) {
        income += amount;
      } else {
        expense += amount;
        categories[category] = (categories[category] || 0) + amount;
        if (amount > largestExpense.amount) {
          largestExpense = { amount, description: description || category };
        }
        if (
          normalize(category).includes("suscripcion") ||
          /(netflix|spotify|youtube|prime|hulu|disney|software|subscription|streaming|icloud|google storage)/.test(descriptionNorm)
        ) {
          subscriptionSignals += 1;
        }
      }

      if (examples.length < 5) {
        examples.push({
          date: idx.date >= 0 ? row[idx.date] : "",
          type: isIncome && !isExpense ? "Ingreso" : "Gasto",
          category,
          description,
          amount,
        });
      }
    });

    const categoryRows = Object.entries(categories)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([category, amount]) => ({
        category,
        amount,
        share: expense ? amount / expense : 0,
      }));

    const available = income - expense;
    const savingsRate = income ? available / income : 0;
    const status =
      savingsRate >= 0.2
        ? "Buen margen: protege el excedente."
        : savingsRate >= 0
          ? "Margen ajustado: revisa categorias grandes."
          : "Alerta: gastaste mas de lo que entro.";

    return {
      transactionCount,
      income,
      expense,
      available,
      savingsRate,
      categoryRows,
      subscriptionSignals,
      largestExpense,
      examples,
      status,
    };
  }

  function currency(value) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(value || 0);
  }

  function percent(value) {
    return `${((value || 0) * 100).toFixed(1)}%`;
  }

  function renderResult(result) {
    const output = document.querySelector("[data-output]");
    if (!output) return;

    if (result.error) {
      output.innerHTML = `<div class="tool-alert">${result.error}</div>`;
      return;
    }

    const categoryHtml = result.categoryRows.length
      ? result.categoryRows
          .map(
            (row) => `
              <tr>
                <td>${escapeHtml(row.category)}</td>
                <td>${currency(row.amount)}</td>
                <td>${percent(row.share)}</td>
              </tr>
            `,
          )
          .join("")
      : `<tr><td colspan="3">No se detectaron gastos categorizados.</td></tr>`;

    output.innerHTML = `
      <div class="metric-grid">
        <div class="metric"><span>Ingresos</span><strong>${currency(result.income)}</strong></div>
        <div class="metric"><span>Gastos</span><strong>${currency(result.expense)}</strong></div>
        <div class="metric"><span>Disponible</span><strong>${currency(result.available)}</strong></div>
        <div class="metric"><span>Tasa ahorro</span><strong>${percent(result.savingsRate)}</strong></div>
      </div>
      <div class="tool-panel">
        <h3>Lectura rapida</h3>
        <p>${escapeHtml(result.status)}</p>
        <p>Transacciones leidas: <strong>${result.transactionCount}</strong>. Posibles suscripciones detectadas: <strong>${result.subscriptionSignals}</strong>. Mayor gasto: <strong>${currency(result.largestExpense.amount)}</strong> ${escapeHtml(result.largestExpense.description || "")}.</p>
      </div>
      <div class="tool-panel">
        <h3>Top categorias de gasto</h3>
        <table class="result-table">
          <thead><tr><th>Categoria</th><th>Monto</th><th>% gastos</th></tr></thead>
          <tbody>${categoryHtml}</tbody>
        </table>
      </div>
    `;
  }

  function escapeHtml(text) {
    return String(text || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function initAnalyzer() {
    const input = document.querySelector("[data-csv-input]");
    const run = document.querySelector("[data-run-analysis]");
    const sample = document.querySelector("[data-load-sample]");
    const file = document.querySelector("[data-file-input]");
    const sampleText = `Fecha,Tipo,Categoria,Descripcion,Monto,Cuenta,Nota
2026-06-01,Ingreso,Otros,Ingreso principal,2800,Banco,Ejemplo
2026-06-02,Gasto,Vivienda,Arriendo,850,Banco,Ejemplo
2026-06-03,Gasto,Comida,Mercado semanal,140,Tarjeta,Ejemplo
2026-06-04,Gasto,Transporte,Gasolina o transporte,75,Tarjeta,Ejemplo
2026-06-05,Gasto,Suscripciones,Streaming,15,Tarjeta,Ejemplo
2026-06-06,Gasto,Ocio,Salida,35,Tarjeta,Ejemplo
2026-06-07,Gasto,Ahorro/Inversion,Ahorro semanal,100,Banco,Ejemplo`;

    if (!input || !run) return;

    function analyze() {
      const rows = parseCSV(input.value);
      renderResult(analyzeRows(rows));
    }

    run.addEventListener("click", analyze);
    sample?.addEventListener("click", () => {
      input.value = sampleText;
      analyze();
    });
    file?.addEventListener("change", async (event) => {
      const selected = event.target.files && event.target.files[0];
      if (!selected) return;
      input.value = await selected.text();
      analyze();
    });

    input.value = sampleText;
    analyze();
  }

  global.budgetAnalyzer = { parseCSV, analyzeRows };
  if (typeof document !== "undefined") {
    document.addEventListener("DOMContentLoaded", initAnalyzer);
  }
})(typeof window !== "undefined" ? window : globalThis);
