import { logger } from "@/lib/logger";
import { isRecord } from "@/lib/types/api-error";
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

  // Escape CSV values if needed
  const escapeCSV = (value: unknown) => {
    if (value === null || value === undefined) return "";
    let str = String(value);
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      str = '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
  };

  // Create each row
  flatData.forEach((item) => {
    const row = headers.map((header) => escapeCSV(item[header])).join(",");
    csvContent += row + "\n";
  });

  // Create a blob and trigger the download
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", finalFileName);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
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

// Helper to convert flattened keys into nested objects/arrays
export function unflatten(obj: Record<string, unknown>) {
  const result: Record<string, unknown> = {};

  for (const flatKey in obj) {
    const value = obj[flatKey];
    const segments = flatKey.split('.');
    let current: Record<string, unknown> = result;

    segments.forEach((segment, idx) => {
      const arrayMatch = segment.match(/^(.+)\[(\d+)\]$/);
      const isLast = idx === segments.length - 1;

      if (arrayMatch) {
        const key = arrayMatch[1];
        const index = parseInt(arrayMatch[2], 10);
        const arr = ensureArray(current[key]);
        current[key] = arr;

        if (isLast) {
          arr[index] = value;
        } else {
          const nested = ensureRecord(arr[index]);
          arr[index] = nested;
          current = nested;
        }
      } else {
        // plain object key
        const key = segment;
        if (isLast) {
          current[key] = value;
        } else {
          const nested = ensureRecord(current[key]);
          current[key] = nested;
          current = nested;
        }
      }
    });
  }

  return result;
}
