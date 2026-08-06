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

  // Backgrounds
  content = content.replace(/(?<!-)bg-muted(?!\w)/g, 'bg-[#f9faf9]');
  content = content.replace(/(?<!-)bg-background(?!\w)/g, 'bg-white');
  content = content.replace(/(?<!-)bg-card(?!\w)/g, 'bg-white');
  content = content.replace(/(?<!-)bg-secondary(?!\w)/g, 'bg-[#f0faf8]');
  
  // Borders
  content = content.replace(/(?<!-)border-border(?!\w)/g, 'border-black/[0.06]');
  content = content.replace(/(?<!-)border-input(?!\w)/g, 'border-black/[0.06]');
  content = content.replace(/(?<!-)border-muted(?!\w)/g, 'border-black/[0.06]');
  
  // Text colors
  content = content.replace(/(?<!-)text-muted-foreground(?!\w)/g, 'text-[#68726d]');
  content = content.replace(/(?<!-)text-secondary-foreground(?!\w)/g, 'text-[#087f70]');
  
  // Radiuses
  content = content.replace(/(?<!-)rounded-xl(?!\w)/g, 'rounded-[14px]');
  content = content.replace(/(?<!-)rounded-2xl(?!\w)/g, 'rounded-[24px]');
  content = content.replace(/(?<!-)rounded-lg(?!\w)/g, 'rounded-[12px]');
  content = content.replace(/(?<!-)rounded-md(?!\w)/g, 'rounded-[8px]');

  // Modal Specifics
  content = content.replace(/sm:max-w-\[425px\]/g, 'sm:max-w-[480px] p-0 border-0 overflow-hidden bg-white rounded-[24px]');
  content = content.replace(/sm:max-w-\[600px\]/g, 'sm:max-w-[600px] p-0 border-0 overflow-hidden bg-white rounded-[24px]');
  content = content.replace(/sm:max-w-\[800px\]/g, 'sm:max-w-[800px] p-0 border-0 overflow-hidden bg-white rounded-[24px]');
  
  // Buttons
  content = content.replace(/variant="default"/g, 'className="bg-[#087f70] text-white hover:opacity-90 rounded-[12px] h-10 px-4 font-semibold text-sm transition-opacity"');
  content = content.replace(/variant="outline"/g, 'className="bg-white border border-black/[0.06] text-[#0b100e] hover:bg-[#f9faf9] rounded-[12px] h-10 px-4 font-semibold text-sm transition-colors"');
  
  if (content !== originalContent) {
    fs.writeFileSync(fullPath, content, 'utf8');
    totalReplacements++;
    console.log(`Modified: ${relPath}`);
  }
});

console.log(`Total files modified: ${totalReplacements}`);
