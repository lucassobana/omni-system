export function downloadCsv(data: Record<string, any>[], filename: string) {
  if (!data || data.length === 0) {
    alert("Nenhum dado para exportar.");
    return;
  }

  const keys = Object.keys(data[0]);
  
  // Headers
  const csvRows = [keys.join(",")];
  
  // Rows
  for (const row of data) {
    const values = keys.map(k => {
      let val = row[k];
      if (val === null || val === undefined) val = "";
      // Escape de vírgulas e aspas para CSV
      val = val.toString().replace(/"/g, '""');
      if (val.search(/("|,|\n)/g) >= 0) {
        val = `"${val}"`;
      }
      return val;
    });
    csvRows.push(values.join(","));
  }

  const csvString = csvRows.join("\n");
  
  // BOM para o Excel reconhecer UTF-8
  const blob = new Blob(["\uFEFF" + csvString], { type: "text/csv;charset=utf-8;" });
  
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
