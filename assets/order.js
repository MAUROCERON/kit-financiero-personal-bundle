(function () {
  const COPY = {
    es: {
      name: "Nombre",
      email: "Email de respuesta",
      currency: "Moneda",
      rows: "Filas aproximadas",
      format: "Formato de entrega",
      useCase: "Tipo de uso",
      rush: "Entrega urgente",
      estimatedPrice: "Precio estimado",
      notes: "Notas:",
      pending: "(pendiente)",
      noNotes: "(sin notas)",
      safety: "No adjunto contrasenas ni logins bancarios. Enviare CSV/XLSX exportado o muestra anonimizada.",
      subject: "Pedido dashboard custom",
      copied: "Copiado",
      rushYes: "Si",
    },
    en: {
      name: "Name",
      email: "Reply email",
      currency: "Currency",
      rows: "Approximate rows",
      format: "Delivery format",
      useCase: "Use case",
      rush: "Rush delivery",
      estimatedPrice: "Estimated price",
      notes: "Notes:",
      pending: "(pending)",
      noNotes: "(no notes)",
      safety: "I am not attaching bank passwords or logins. I will send an exported CSV/XLSX file or an anonymized sample.",
      subject: "Custom finance dashboard order",
      copied: "Copied",
      rushYes: "Yes",
    },
  };

  function language() {
    return document.documentElement.lang && document.documentElement.lang.toLowerCase().startsWith("en") ? "en" : "es";
  }

  function text(key) {
    const lang = language();
    return (COPY[lang] && COPY[lang][key]) || COPY.es[key] || key;
  }

  function value(name) {
    const field = document.querySelector(`[name="${name}"]`);
    return field ? field.value.trim() : "";
  }

  function estimatePrice(rows, rush) {
    const count = Number.parseInt(rows || "0", 10);
    let price = 49;
    if (count > 300 && count <= 800) price = 95;
    if (count > 800) price = 149;
    if (rush === "Si" || rush === "Yes") price += 25;
    return price;
  }

  function updateBrief() {
    const rows = value("rows");
    const rush = value("rush");
    const price = estimatePrice(rows, rush);
    const summary = [
      `${text("name")}: ${value("name") || text("pending")}`,
      `${text("email")}: ${value("email") || text("pending")}`,
      `${text("currency")}: ${value("currency") || "USD"}`,
      `${text("rows")}: ${rows || text("pending")}`,
      `${text("format")}: ${value("format") || "Excel"}`,
      `${text("useCase")}: ${value("useCase") || text("pending")}`,
      `${text("rush")}: ${rush || "No"}`,
      `${text("estimatedPrice")}: USD ${price}`,
      "",
      text("notes"),
      value("notes") || text("noNotes"),
      "",
      text("safety"),
    ].join("\n");

    const output = document.querySelector("[data-brief-output]");
    const priceNode = document.querySelector("[data-estimated-price]");
    const mail = document.querySelector("[data-mailto]");
    const paypalAmount = document.querySelector("[data-paypal-amount]");

    if (output) output.value = summary;
    if (priceNode) priceNode.textContent = `USD ${price}`;
    if (paypalAmount) paypalAmount.value = price.toFixed(2);
    if (mail) {
      const subject = encodeURIComponent(`${text("subject")} - USD ${price}`);
      const body = encodeURIComponent(summary);
      mail.href = `mailto:mauro_ceron1@hotmail.com?subject=${subject}&body=${body}`;
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll("[data-order-field]").forEach((field) => {
      field.addEventListener("input", updateBrief);
      field.addEventListener("change", updateBrief);
    });
    document.querySelector("[data-copy-brief]")?.addEventListener("click", async () => {
      const output = document.querySelector("[data-brief-output]");
      if (!output) return;
      try {
        await navigator.clipboard.writeText(output.value);
        document.querySelector("[data-copy-brief]").textContent = text("copied");
      } catch {
        output.select();
      }
    });
    updateBrief();
  });
})();
