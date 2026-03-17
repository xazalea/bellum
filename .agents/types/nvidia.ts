import { AgentDefinition } from './types/agent-definition';

const nvidiaAgent: AgentDefinition = {
  id: 'glm',
  displayName: 'GLM-5 (NVIDIA)',
  // Codebuff uses the 'openai-compatible' provider type for custom URLs
  provider: 'openai-compatible', 
  model: 'z-ai/glm5',
  baseUrl: 'https://integrate.api.nvidia.com/v1',
  apiKey: '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',
  instructionsPrompt: 'You are an expert software engineer using the GLM-5 model.',
  toolNames: ['read_files', 'run_terminal_command', 'edit_file', 'list_files']
};

export default nvidiaAgent;