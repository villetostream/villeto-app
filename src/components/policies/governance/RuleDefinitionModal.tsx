"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUpdateSpendProgramRuleDefinition, type UpdateRuleDefinitionPayload } from "@/queries/procurement/policies";
import type { RuleDefinition } from "../procurement/types";

const STAGE_OPTIONS = [
  { id: "pr_submission", label: "PR Submission" },
  { id: "pr_to_po", label: "PR to PO Conversion" },
  { id: "po_submission", label: "PO Submission" },
];

const ACTION_OPTIONS = [
  { id: "allow", label: "Allow" },
  { id: "block", label: "Block" },
  { id: "require_approval", label: "Require Approval" },
];

type RuleVariable = {
  id: string;
  name: string;
  type: "string" | "number" | "boolean" | "array" | "attachment";
  required: boolean;
};

const compileSchema = (vars: RuleVariable[]) => {
  const schema: any = {};
  
  vars.forEach(v => {
    const key = v.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_");
    if (!key) return;

    let typeStr = v.type;
    if (!v.required) {
      typeStr = "optional " + typeStr;
    }

    schema[key] = typeStr;
  });

  return schema;
};

const parseSchema = (schema: any): RuleVariable[] => {
  if (!schema) return [];
  let parsed = schema;
  if (typeof schema === 'string') {
    try { parsed = JSON.parse(schema); } catch { return []; }
  }
  
  if (typeof parsed !== 'object' || Array.isArray(parsed)) return [];

  const vars: RuleVariable[] = [];
  
  Object.entries(parsed).forEach(([key, value]) => {
    if (typeof value !== 'string') return;
    
    const valLower = value.toLowerCase();
    let type: RuleVariable["type"] = "string";
    
    if (valLower.includes("number") || valLower.includes("integer")) type = "number";
    if (valLower.includes("boolean")) type = "boolean";
    if (valLower.includes("array") || valLower.includes("list")) type = "array";
    if (valLower.includes("attachment") || valLower.includes("file")) type = "attachment";
    
    const required = !valLower.includes("optional");
    const friendlyName = key.split("_").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
    
    vars.push({
      id: Math.random().toString(36).substr(2, 9),
      name: friendlyName,
      type,
      required,
    });
  });
  return vars;
};

export function RuleDefinitionModal({
  isOpen,
  onClose,
  initialData,
}: {
  isOpen: boolean;
  onClose: () => void;
  initialData?: RuleDefinition | null;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [groups, setGroups] = useState<string[]>([]);
  const [allowedActions, setAllowedActions] = useState<string[]>([]);
  const [variables, setVariables] = useState<RuleVariable[]>([]);
  const [isActive, setIsActive] = useState(true);

  const updateMutation = useUpdateSpendProgramRuleDefinition();

  useEffect(() => {
    if (initialData && isOpen) {
      setName(initialData.name);
      setDescription(initialData.description || "");
      setGroups(initialData.groups || []);
      setAllowedActions(initialData.allowedActions || []);
      setIsActive(initialData.isActive ?? true);
      setVariables(parseSchema(initialData.conditionSchema));
    } else if (isOpen) {
      setName("");
      setDescription("");
      setGroups(["pr_submission"]);
      setAllowedActions(["allow", "block", "require_approval"]);
      setIsActive(true);
      setVariables([]);
    }
  }, [initialData, isOpen]);

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Rule Name is required.");
      return;
    }
    if (groups.length === 0 || allowedActions.length === 0) {
      toast.error("Select at least one trigger stage and one allowed action.");
      return;
    }

    // Auto-generate ruleType from name if creating new, else use existing
    const ruleType = initialData?.ruleType || name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_");

    const conditionSchema = compileSchema(variables);

    const payload: UpdateRuleDefinitionPayload = {
      ruleType,
      name: name.trim(),
      description: description.trim(),
      groups,
      allowedActions,
      conditionSchema,
      actionSchema: {}, // Abstracted away for non-technical users
      isActive,
    };

    try {
      await updateMutation.mutateAsync(payload);
      toast.success(initialData ? "Rule definition updated." : "Rule definition created.");
      onClose();
    } catch {
      toast.error("Failed to save rule definition.");
    }
  };

  const toggleGroup = (id: string) => setGroups(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  const toggleAction = (id: string) => setAllowedActions(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);

  const addVariable = () => {
    setVariables([...variables, { id: Math.random().toString(36).substr(2, 9), name: "", type: "number", required: true }]);
  };

  const updateVariable = (id: string, field: keyof RuleVariable, value: any) => {
    setVariables(vars => vars.map(v => v.id === id ? { ...v, [field]: value } : v));
  };

  const removeVariable = (id: string) => {
    setVariables(vars => vars.filter(v => v.id !== id));
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl bg-[#f4f7f5] p-0 overflow-hidden rounded-[24px]">
        <DialogHeader className="p-6 pb-4 bg-white border-b border-black/[0.06]">
          <DialogTitle className="text-[19px] font-semibold text-[#10231d]">
            {initialData ? "Edit Rule Definition" : "Create Rule Definition"}
          </DialogTitle>
        </DialogHeader>

        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          <div className="space-y-2">
            <label className="text-[13px] font-medium text-[#10231d]">Rule Name</label>
            <input
              placeholder="e.g. Maximum PR Amount"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full h-10 px-3 rounded-[9px] border border-black/[0.08] text-[13px]"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[13px] font-medium text-[#10231d]">Description</label>
            <textarea
              placeholder="What does this rule do?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full h-20 p-3 rounded-[9px] border border-black/[0.08] text-[13px] resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-3">
              <label className="text-[13px] font-medium text-[#10231d]">Trigger Stages</label>
              <div className="space-y-2">
                {STAGE_OPTIONS.map(opt => (
                  <label key={opt.id} className="flex items-center gap-2 cursor-pointer">
                    <Checkbox checked={groups.includes(opt.id)} onCheckedChange={() => toggleGroup(opt.id)} />
                    <span className="text-[13px] text-[#52605b]">{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="space-y-3">
              <label className="text-[13px] font-medium text-[#10231d]">Allowed Actions</label>
              <div className="space-y-2">
                {ACTION_OPTIONS.map(opt => (
                  <label key={opt.id} className="flex items-center gap-2 cursor-pointer">
                    <Checkbox checked={allowedActions.includes(opt.id)} onCheckedChange={() => toggleAction(opt.id)} />
                    <span className="text-[13px] text-[#52605b]">{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-black/[0.06]">
            <div>
              <h3 className="text-[14px] font-semibold text-[#10231d]">Rule Variables</h3>
              <p className="text-[12px] text-[#84908a] mt-1">
                Define the inputs required when this rule is configured (e.g. Amount Limit, Category List).
              </p>
            </div>

            <div className="space-y-3">
              {variables.map((v, index) => (
                <div key={v.id} className="flex items-center gap-3 bg-white p-3 rounded-xl border border-black/[0.06]">
                  <div className="flex-1 space-y-1">
                    <label className="text-[11px] font-semibold text-[#68726d] uppercase">Variable Name</label>
                    <input
                      placeholder="e.g. Max Amount"
                      value={v.name}
                      onChange={(e) => updateVariable(v.id, "name", e.target.value)}
                      className="w-full h-9 px-3 rounded-md border border-black/[0.08] text-[13px]"
                    />
                  </div>
                  <div className="w-32 space-y-1">
                    <label className="text-[11px] font-semibold text-[#68726d] uppercase">Type</label>
                    <Select value={v.type} onValueChange={(val: any) => updateVariable(v.id, "type", val)}>
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="number">Number</SelectItem>
                        <SelectItem value="string">Text</SelectItem>
                        <SelectItem value="boolean">Yes/No</SelectItem>
                        <SelectItem value="array">List of Items</SelectItem>
                        <SelectItem value="attachment">Attachment (File Types)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-20 space-y-1 flex flex-col items-center">
                    <label className="text-[11px] font-semibold text-[#68726d] uppercase">Required</label>
                    <div className="h-9 flex items-center">
                      <Checkbox checked={v.required} onCheckedChange={(c) => updateVariable(v.id, "required", !!c)} />
                    </div>
                  </div>
                  <div className="w-10 flex flex-col items-center justify-end h-full">
                    <div className="h-9 flex items-center">
                      <button onClick={() => removeVariable(v.id)} className="text-[#84908a] hover:text-red-500 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={addVariable}
              className="h-10 px-4 rounded-lg border border-black/[0.1] bg-white text-[13px] font-semibold text-[#52605b] hover:bg-[#f9faf9] transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Add Variable
            </button>
          </div>
        </div>

        <div className="p-6 pt-4 bg-white border-t border-black/[0.06] flex justify-end gap-3">
          <button
            onClick={onClose}
            className="h-10 px-6 rounded-lg border border-black/[0.1] text-[13px] font-semibold text-[#52605b] hover:bg-[#f4f7f5] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={updateMutation.isPending}
            className="h-10 px-6 rounded-lg bg-[#08b6a3] text-white text-[13px] font-semibold hover:bg-[#08a291] transition-colors flex items-center gap-2"
          >
            {updateMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            {initialData ? "Save Changes" : "Create Rule"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
