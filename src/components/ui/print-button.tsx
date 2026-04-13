"use client";

export function PrintButton() {
  const handlePrint = () => {
    window.print();
  };

  return (
    <button
      onClick={handlePrint}
      className="px-4 py-2 bg-line/50 hover:bg-line text-fg rounded-md transition-colors text-sm font-medium print:hidden"
    >
      Download / Print as PDF
    </button>
  );
}
