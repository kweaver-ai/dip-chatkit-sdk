import { ChatKitBaseProps } from '../base/ChatKitBase';
import { StudioBaseMixin, StudioBaseProps } from './StudioBase';
import StudioAssistantBase from './StudioAssistantBase';

export interface StudioAssistantProps extends ChatKitBaseProps, StudioBaseProps {}

// @ts-ignore - mixin abstract typing
export class StudioAssistant extends StudioBaseMixin(StudioAssistantBase as any) {}

export default StudioAssistant;
