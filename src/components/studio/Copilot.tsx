import type React from 'react';
import { CopilotBase } from '../base/copilot/CopilotBase';
import { ChatKitBaseProps } from '../base/ChatKitBase';
import { StudioBaseMixin, StudioBaseProps } from './StudioBase';
import StudioCopilotInputArea from './CopilotInputArea';
import StudioCopilotPrologue from './CopilotPrologue';

export interface StudioCopilotProps extends ChatKitBaseProps, StudioBaseProps {}

// @ts-ignore - mixin abstract typing
export class StudioCopilot extends StudioBaseMixin(CopilotBase as any) {
  public InputAreaComponent: React.ComponentType<any> = StudioCopilotInputArea;
  public PrologueComponent: React.ComponentType<any> = StudioCopilotPrologue;

  public getInputAreaProps = () => ({
    attachments: this.state.pendingAttachments,
    onUploadFiles: this.handleUploadFiles,
    onRemoveAttachment: this.removePendingAttachment,
    canUpload: typeof (this as any).uploadAttachment === 'function',
  });

  public resolveChatTitle = (title: string) =>
    this.studioAssistantName || title;
}

export default StudioCopilot;
