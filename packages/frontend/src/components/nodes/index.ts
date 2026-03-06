import { NodeType } from "@obsidian-tasks/shared";
import { IngestionNode } from "./IngestionNode.js";
import { JdParserNode } from "./JdParserNode.js";
import { ProfileNode } from "./ProfileNode.js";
import { ProjectSelectorNode } from "./ProjectSelectorNode.js";
import { ResumeComposerNode } from "./ResumeComposerNode.js";
import { AtsOptimizerNode } from "./AtsOptimizerNode.js";
import { OutputValidatorNode } from "./OutputValidatorNode.js";
import { DocxGeneratorNode } from "./DocxGeneratorNode.js";

export const nodeTypes = {
  [NodeType.INGESTION]: IngestionNode,
  [NodeType.JD_PARSER]: JdParserNode,
  [NodeType.PROFILE]: ProfileNode,
  [NodeType.PROJECT_SELECTOR]: ProjectSelectorNode,
  [NodeType.RESUME_COMPOSER]: ResumeComposerNode,
  [NodeType.ATS_OPTIMIZER]: AtsOptimizerNode,
  [NodeType.OUTPUT_VALIDATOR]: OutputValidatorNode,
  [NodeType.DOCX_GENERATOR]: DocxGeneratorNode,
};

export { BaseNode } from "./BaseNode.js";
export type { BaseNodeData } from "./BaseNode.js";
