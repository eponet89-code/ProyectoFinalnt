import * as XLSX from "xlsx";

export const readXlsx = async (filePath) => {
  const response = await fetch(filePath);
  const arrayBuffer = await response.arrayBuffer();

  const workbook = XLSX.read(arrayBuffer, { type: "array" });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  return XLSX.utils.sheet_to_json(sheet);
};
