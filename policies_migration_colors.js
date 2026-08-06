const fs = require('fs');
const path = require('path');

const targetFiles = [
  'src/app/(dashboard)/policies/page.tsx',
  'src/components/policies/PolicyCreationModal.tsx',
  'src/components/policies/SimpleAddExpenseCategoryDialog.tsx',
  'src/components/policies/procurement/ProcurementPolicySection.tsx',
  'src/components/policies/procurement/ProcurementPolicyWizard.tsx',
  'src/components/policies/procurement/ProcurementPolicyDetailsModal.tsx',
  'src/components/policies/procurement/Stepper.tsx',
  'src/components/policies/procurement/steps/AddExceptionModal.tsx',
  'src/components/policies/procurement/steps/StepApproval.tsx',
  'src/components/policies/procurement/steps/StepConfigure.tsx',
  'src/components/policies/procurement/steps/StepPolicyGroup.tsx',
  'src/components/policies/procurement/steps/StepReview.tsx',
  'src/components/policies/procurement/steps/StepRules.tsx',
  'src/components/policies/procurement/steps/StepScope.tsx',
];

let totalReplacements = 0;

targetFiles.forEach(relPath => {
  const fullPath = path.join(__dirname, relPath);
  if (!fs.existsSync(fullPath)) {
    console.warn('File not found:', fullPath);
    return;
  }
  
  let content = fs.readFileSync(fullPath, 'utf8');
  let originalContent = content;

  // Replace legacy green color with new premium green
  content = content.replace(/#03C3A6/g, '#087f70');
  content = content.replace(/#03c3a6/g, '#087f70');

  // Replace gray-900/800 with #0b100e, gray-500/400/600 with #68726d, gray-200/100/50 with transparent borders or #f9faf9
  content = content.replace(/text-gray-900/g, 'text-[#0b100e]');
  content = content.replace(/text-gray-800/g, 'text-[#0b100e]');
  content = content.replace(/text-gray-700/g, 'text-[#0b100e]');
  content = content.replace(/text-gray-600/g, 'text-[#68726d]');
  content = content.replace(/text-gray-500/g, 'text-[#68726d]');
  content = content.replace(/text-gray-400/g, 'text-[#84908a]');
  
  content = content.replace(/bg-gray-50/g, 'bg-[#f9faf9]');
  content = content.replace(/bg-gray-100/g, 'bg-[#f5f7f6]');
  content = content.replace(/border-gray-200/g, 'border-black/[0.06]');
  content = content.replace(/border-gray-300/g, 'border-black/[0.12]');

  if (content !== originalContent) {
    fs.writeFileSync(fullPath, content, 'utf8');
    totalReplacements++;
    console.log(`Modified colors in: ${relPath}`);
  }
});

console.log(`Total files modified for colors: ${totalReplacements}`);
