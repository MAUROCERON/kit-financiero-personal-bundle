(function () {
  function value(name) {
    const field = document.querySelector(`[name="${name}"]`);
    return field ? field.value.trim() : "";
  }

  function estimatePrice(rows, rush) {
    const count = Number.parseInt(rows || "0", 10);
    let price = 49;
    if (count > 300 && count <= 800) price = 95;
    if (count > 800) price = 149;
    if (rush === "Si") price += 25;
    return price;
  }

  function updateBrief() {
    const rows = value("rows");
    const rush = value("rush");
    const price = estimatePrice(rows, rush);
    const summary = [
      `Nombre: ${value("name") || "(pendiente)"}`,
      `Email de respuesta: ${value("email") || "(pendiente)"}`,
      `Moneda: ${value("currency") || "USD"}`,
      `Filas aproximadas: ${rows || "(pendiente)"}`,
      `Formato de entrega: ${value("format") || "Excel"}`,
      `Tipo de uso: ${value("useCase") || "(pendiente)"}`,
      `Entrega urgente: ${rush || "No"}`,
      `Precio estimado: USD ${price}`,
      "",
      "Notas:",
      value("notes") || "(sin notas)",
      "",
      "No adjunto contrasenas ni logins bancarios. Enviare CSV/XLSX exportado o muestra anonimizada.",
    ].join("\n");

    const output = document.querySelector("[data-brief-output]");
    const priceNode = document.querySelector("[data-estimated-price]");
    const mail = document.querySelector("[data-mailto]");
    const paypalAmount = document.querySelector("[data-paypal-amount]");

    if (output) output.value = summary;
    if (priceNode) priceNode.textContent = `USD ${price}`;
    if (paypalAmount) paypalAmount.value = price.toFixed(2);
    if (mail) {
      const subject = encodeURIComponent(`Pedido dashboard custom - USD ${price}`);
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
        document.querySelector("[data-copy-brief]").textContent = "Copiado";
      } catch {
        output.select();
      }
    });
    updateBrief();
  });
})();
