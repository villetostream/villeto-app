import { logger } from "@/lib/logger";
import { isRecord } from "@/lib/types/api-error";
import { DANGEROUS_OBJECT_KEYS } from "@/lib/security/file-upload";
// function flattenObject(ob: unknown, prefix = "", result: unknown = {}): unknown {
//     for (const key in ob) {
//       if (Object.prototype.hasOwnProperty.call(ob, key)) {
//         const value = ob[key];
//         const newKey = prefix ? `${prefix}.${key}` : key;
//         if (value !== null && typeof value === "object") {
//           if (Array.isArray(value)) {
//             // For arrays, flatten each item with its index
//             value.forEach((item, index) => {
//               if (item !== null && typeof item === "object") {
//                 flattenObject(item, `${newKey}[${index}]`, result);
//               } else {
//                 result[`${newKey}[${index}]`] = item;
//               }
//             });
//           } else {
//             flattenObject(value, newKey, result);
//           }
//         } else {
//           result[newKey] = value;
//         }
//       }
//     }
//     return result;
//   }

//   // Function to export data as CSV. If filename isn't provided, it is generated based on the type.
//   export default function exportToCSV(
//     data: unknown,
//     type: string,
//     filename?: string
//   ) {
//     // Determine final filename based on type if not provided
//     const finalFileName =
//       filename ||
//       (type === "workOrder" ? "work order.csv" : `${type}.csv`);

//     let csvContent = "";
//     // Ensure data is an array
//     const dataArray = Array.isArray(data) ? data : [data];

//     // Flatten each item in the data array
//     const flatData = dataArray.map((item) => flattenObject(item));

//     // Collect all unique headers
//     const headersSet = new Set<string>();
//     flatData.forEach((item) => {
//       Object.keys(item).forEach((key) => headersSet.add(key));
//     });
//     const headers = Array.from(headersSet);
//     csvContent += headers.join(",") + "\n";

//     // Escape CSV values if needed
//     const escapeCSV = (value: unknown) => {
//       if (value === null || value === undefined) return "";
//       let str = String(value);
//       if (str.includes(",") || str.includes('"') || str.includes("\n")) {
//         str = '"' + str.replace(/"/g, '""') + '"';
//       }
//       return str;
//     };

//     // Create each row
//     flatData.forEach((item) => {
//       const row = headers.map((header) => escapeCSV(item[header])).join(",");
//       csvContent += row + "\n";
//     });

//     // Create a blob and trigger the download
//     const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
//     const link = document.createElement("a");
//     const url = URL.createObjectURL(blob);
//     link.setAttribute("href", url);
//     link.setAttribute("download", finalFileName);
//     link.style.visibility = "hidden";
//     document.body.appendChild(link);
//     link.click();
//     document.body.removeChild(link);
//   }

//for exclusion of id
function flattenObject(
  ob: Record<string, unknown>,
  prefix = "",
  result: Record<string, unknown> = {}
): Record<string, unknown> {
  for (const key in ob) {
    if (Object.prototype.hasOwnProperty.call(ob, key)) {
      // Ignore keys that include "id" (case-insensitive)
      if (key.toLowerCase().includes("id")) {
        continue;
      }
      const value = ob[key];
      const newKey = prefix ? `${prefix}.${key}` : key;
      if (value !== null && typeof value === "object") {
        if (Array.isArray(value)) {
          // For arrays, flatten each item with its index
          value.forEach((item, index) => {
            if (isRecord(item)) {
              flattenObject(item, `${newKey}[${index}]`, result);
            } else {
              result[`${newKey}[${index}]`] = item;
            }
          });
        } else if (isRecord(value)) {
          flattenObject(value, newKey, result);
        }
      } else {
        result[newKey] = value;
      }
    }
  }
  return result;
}

// Escape CSV values and neutralize spreadsheet formula injection (=, +, -, @, tab, CR)
export function escapeCSVValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  let str = String(value);
  if (/^[\s\t\r]*[=+\-@]/.test(str) || str.startsWith("\t") || str.startsWith("\r")) {
    str = `'${str}`;
  }
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    str = '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

// Function to export data as CSV. If filename isn't provided, it is generated based on the type.
export default function exportToCSV(
  data: unknown,
  type: string,
  filename?: string
) {
  logger.log("ln118data", data)
  // Determine final filename based on type if not provided
  const finalFileName =
    filename || (type === "workOrder" ? "work order.csv" : `${type}.csv`);

  let csvContent = "";
  // Ensure data is an array
  const dataArray = Array.isArray(data) ? data : [data];
  logger.log("dataArray", dataArray)

  // Flatten each item in the data array
  const flatData = dataArray.map((item) =>
    flattenObject(isRecord(item) ? item : {})
  );
  logger.log("flatData", flatData);

  // Collect all unique headers
  const headersSet = new Set<string>();
  flatData.forEach((item) => {
    Object.keys(item).forEach((key) => headersSet.add(key));
  });
  const headers = Array.from(headersSet);
  csvContent += headers.join(",") + "\n";

  // Create each row
  flatData.forEach((item) => {
    const row = headers.map((header) => escapeCSVValue(item[header])).join(",");
    csvContent += row + "\n";
  });

  // Create a blob and trigger the download
  const safeFileName = finalFileName.replace(/[\\/:*?"<>|\r\n]/g, "_");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", safeFileName);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

//alternative
// function flattenObject(ob: unknown, prefix = "", result: unknown = {}): unknown {
//   for (const key in ob) {
//     if (Object.prototype.hasOwnProperty.call(ob, key)) {
//       const value = ob[key];
//       const newKey = prefix ? `${prefix}.${key}` : key;
//       if (value !== null && typeof value === "object") {
//         // Instead of flattening further, store as a JSON string if it's not a plain object.
//         // Optionally, you could add logic here to decide when to flatten versus stringify.
//         result[newKey] = JSON.stringify(value);
//       } else {
//         result[newKey] = value;
//       }
//     }
//   }
//   return result;
// }

// // Function to export data as CSV. If filename isn't provided, it is generated based on the type.
// export default function exportToCSV(
//   data: unknown,
//   type: string,
//   filename?: string
// ) {
//   // Determine final filename based on type if not provided
//   const finalFileName =
//     filename || (type === "workOrder" ? "work order.csv" : `${type}.csv`);

//   let csvContent = "";
//   // Ensure data is an array
//   const dataArray = Array.isArray(data) ? data : [data];

//   // Flatten each item in the data array
//   const flatData = dataArray.map((item) => flattenObject(item));

//   // Collect all unique headers
//   const headersSet = new Set<string>();
//   flatData.forEach((item) => {
//     Object.keys(item).forEach((key) => headersSet.add(key));
//   });
//   const headers = Array.from(headersSet);
//   csvContent += headers.join(",") + "\n";

//   // Escape CSV values if needed
//   const escapeCSV = (value: unknown) => {
//     if (value === null || value === undefined) return "";
//     let str = String(value);
//     if (str.includes(",") || str.includes('"') || str.includes("\n")) {
//       str = '"' + str.replace(/"/g, '""') + '"';
//     }
//     return str;
//   };

//   // Create each row
//   flatData.forEach((item) => {
//     const row = headers.map((header) => escapeCSV(item[header])).join(",");
//     csvContent += row + "\n";
//   });

//   // Create a blob and trigger the download
//   const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
//   const link = document.createElement("a");
//   const url = URL.createObjectURL(blob);
//   link.setAttribute("href", url);
//   link.setAttribute("download", finalFileName);
//   link.style.visibility = "hidden";
//   document.body.appendChild(link);
//   link.click();
//   document.body.removeChild(link);
// }


function ensureArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function ensureRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

// Helper to convert flattened keys into nested objects/arrays safely (guards against prototype pollution)
export function unflatten(obj: Record<string, unknown>) {
  const result: Record<string, unknown> = {};

  for (const flatKey of Object.keys(obj)) {
    const value = obj[flatKey];
    const segments = flatKey.split(".");
    if (segments.some((seg) => {
      const base = seg.replace(/\[\d+\]$/, "");
      return DANGEROUS_OBJECT_KEYS.has(seg) || DANGEROUS_OBJECT_KEYS.has(base);
    })) {
      continue;
    }

    let current: Record<string, unknown> = result;

    for (let idx = 0; idx < segments.length; idx++) {
      const segment = segments[idx];
      const arrayMatch = segment.match(/^(.+)\[(\d+)\]$/);
      const isLast = idx === segments.length - 1;

      if (arrayMatch) {
        const key = arrayMatch[1];
        const index = parseInt(arrayMatch[2], 10);
        if (DANGEROUS_OBJECT_KEYS.has(key) || !Number.isFinite(index) || index < 0 || index >= 10_000) {
          break;
        }
        const arr = ensureArray(Object.prototype.hasOwnProperty.call(current, key) ? current[key] : undefined);
        current[key] = arr;

        if (isLast) {
          arr[index] = value;
        } else {
          const nested = ensureRecord(arr[index]);
          arr[index] = nested;
          current = nested;
        }
      } else {
        const key = segment;
        if (DANGEROUS_OBJECT_KEYS.has(key)) {
          break;
        }
        if (isLast) {
          current[key] = value;
        } else {
          const existing = Object.prototype.hasOwnProperty.call(current, key) ? current[key] : undefined;
          const nested = ensureRecord(existing);
          current[key] = nested;
          current = nested;
        }
      }
    }
  }

  return result;
}
