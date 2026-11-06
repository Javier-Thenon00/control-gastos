(() => {
  const STORAGE_KEY = "control-gastos-movimientos-v1";
  const form = document.getElementById("movementForm");
  const list = document.getElementById("movementList");
  const filter = document.getElementById("filterType");
  const message = document.getElementById("formMessage");
  const dateInput = document.getElementById("date");
  let selectedType = "gasto";
  let movements = loadMovements();

  function loadMovements() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      return Array.isArray(parsed) ? parsed.filter(item =>
        item && typeof item.id === "string" && ["ingreso", "gasto"].includes(item.type) &&
        typeof item.description === "string" && Number.isFinite(Number(item.amount))
      ) : [];
    } catch { return []; }
  }
  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(movements)); return true; }
    catch { message.textContent = "No se pudo guardar. Revisá el espacio disponible del navegador."; return false; }
  }
  const money = value => new Intl.NumberFormat("es-AR", {style:"currency",currency:"ARS"}).format(value);
  const safe = value => String(value).replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
  const dateLabel = value => {
    const [year, month, day] = value.split("-");
    return year && month && day ? day + "/" + month + "/" + year : value;
  };
  function render() {
    const income = movements.filter(m => m.type === "ingreso").reduce((sum,m) => sum + Number(m.amount), 0);
    const expense = movements.filter(m => m.type === "gasto").reduce((sum,m) => sum + Number(m.amount), 0);
    document.getElementById("balanceValue").textContent = money(income-expense);
    document.getElementById("incomeValue").textContent = money(income);
    document.getElementById("expenseValue").textContent = money(expense);
    const total = income + expense;
    const incomePct = total ? Math.round(income/total*100) : 0;
    const expensePct = total ? Math.round(expense/total*100) : 0;
    document.getElementById("incomePercent").textContent = incomePct + "%";
    document.getElementById("expensePercent").textContent = expensePct + "%";
    document.getElementById("incomeBar").style.width = incomePct + "%";
    document.getElementById("expenseBar").style.width = expensePct + "%";
    document.getElementById("movementCount").textContent = movements.length + (movements.length === 1 ? " movimiento" : " movimientos");

    const visible = movements.filter(m => filter.value === "todos" || m.type === filter.value)
      .sort((a,b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
    if (!visible.length) {
      list.innerHTML = '<tr><td colspan="6" class="empty-state">No hay movimientos para mostrar.</td></tr>';
      return;
    }
    list.innerHTML = visible.map(m => {
      const typeLabel = m.type === "ingreso" ? "Ingreso" : "Gasto";
      return '<tr><td>' + safe(m.description) + '</td><td><span class="tag">' + safe(m.category) + '</span></td><td>' + dateLabel(m.date) + '</td><td><span class="tag type-tag-' + m.type + '">' + typeLabel + '</span></td><td class="align-right ' + (m.type === "ingreso" ? "amount-income" : "amount-expense") + '">' + (m.type === "ingreso" ? "+" : "−") + money(Number(m.amount)) + '</td><td><button class="delete-button" type="button" data-delete="' + safe(m.id) + '" aria-label="Eliminar ' + safe(m.description) + '" title="Eliminar">×</button></td></tr>';
    }).join("");
  }

  document.querySelectorAll(".type-button").forEach(button => button.addEventListener("click", () => {
    selectedType = button.dataset.type;
    document.querySelectorAll(".type-button").forEach(item => {
      const active = item === button;
      item.classList.toggle("selected", active);
      item.setAttribute("aria-pressed", String(active));
    });
    document.getElementById("category").value = selectedType === "ingreso" ? "Sueldo" : "Alimentación";
  }));

  form.addEventListener("submit", event => {
    event.preventDefault();
    const description = form.elements.description.value.trim();
    const amount = Number(form.elements.amount.value);
    const category = form.elements.category.value;
    const date = form.elements.date.value;
    if (!description || !Number.isFinite(amount) || amount <= 0 || !date) {
      message.textContent = "Completá todos los campos con un importe mayor a cero.";
      return;
    }
    const movement = {id: (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random()), type:selectedType, description, amount:Math.round(amount*100)/100, category, date};
    movements.push(movement);
    if (!save()) { movements.pop(); return; }
    form.reset();
    dateInput.value = new Date().toLocaleDateString("en-CA");
    message.textContent = "Movimiento guardado correctamente.";
    document.getElementById("category").value = "Alimentación";
    render();
  });

  list.addEventListener("click", event => {
    const button = event.target.closest("[data-delete]");
    if (!button) return;
    const id = button.dataset.delete;
    const previous = movements;
    movements = movements.filter(m => m.id !== id);
    if (!save()) { movements = previous; return; }
    message.textContent = "Movimiento eliminado.";
    render();
  });
  filter.addEventListener("change", render);

  document.getElementById("exportButton").addEventListener("click", () => {
    if (!movements.length) { message.textContent = "Todavía no hay datos para exportar."; return; }
    const rows = [["Fecha","Tipo","Descripción","Categoría","Importe"], ...movements.map(m => [m.date,m.type,m.description,m.category,Number(m.amount).toFixed(2)])];
    const csv = "\uFEFF" + rows.map(row => row.map(value => '"' + String(value).replace(/"/g,'""') + '"').join(";")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], {type:"text/csv;charset=utf-8;"}));
    const link = document.createElement("a");
    link.href = url; link.download = "mis-movimientos.csv"; link.click();
    URL.revokeObjectURL(url);
  });

  dateInput.value = new Date().toLocaleDateString("en-CA");
  render();
})();