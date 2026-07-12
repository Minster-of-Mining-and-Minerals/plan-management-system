export function printCashierReceipt(html: string, title = "Receipt") {
  const printWindow = window.open("", "_blank", "noopener,noreferrer,width=800,height=900");
  if (!printWindow) {
    throw new Error("Pop-up blocked. Allow pop-ups to print receipts.");
  }
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.document.title = title;
  printWindow.focus();
  printWindow.onload = () => {
    printWindow.print();
  };
}
