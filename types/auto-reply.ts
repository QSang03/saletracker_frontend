export enum ContactRole {
  SUPPLIER = 'supplier',
  CUSTOMER = 'customer',
  INTERNAL = 'internal',
}

export interface SalesPersona {
  personaId: number;
  name: string;
  personaPrompt: string;
  userId?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface AutoReplyProductPriceTier {
  priceTierId: number;
  productId: number;
  minQuantity: number;
  pricePerUnit: string;
}

export interface AutoReplyProduct {
  productId: number;
  code: string;
  name: string;
  brand: string;
  cate: string;
  attrs?: { title: string; description: string }[];
  stock: number;
  priceTiers?: AutoReplyProductPriceTier[];
}

export interface AutoReplyContact {
  contactId: number;
  name: string;
  zaloContactId: string;
  role: ContactRole;
  autoReplyOn: boolean;
  lastMessage?: string | null;
  assignedPersona?: SalesPersona | null;
  autoReplyEnabledAt?: string | null;
  autoReplyDisabledAt?: string | null;
  user?: {
    id: number;
    username: string;
  };
}

export interface AutoReplyCustomerProfile {
  profileId: number;
  contactId: number;
  notes: string;
  toneHints: string;
  aovThreshold: string | null;
}

export interface ContactAllowedProduct {
  contactId: number;
  productId: number;
  active: boolean;
}

export interface RouteProduct {
  id: number;
  routeId: number;
  productId: number;
  priority: number;
  active: boolean;
}

export interface KeywordRoute {
  routeId: number;
  keyword: string;
  active: boolean;
  contactId: number | null;
  routeProducts: RouteProduct[];
}

export enum ConversationState {
  SLEEP = 'SLEEP',
  IDLE = 'IDLE',
  PROCESSING = 'PROCESSING',
  ESCALATED = 'ESCALATED',
  COMPLETED = 'COMPLETED',
}

export enum AutoReplyMessageRole {
  USER = 'user',
  ASSISTANT = 'assistant',
  HUMAN = 'human',
  SYSTEM = 'system',
  TOOL = 'tool',
}

export interface Conversation {
  convId: number;
  contactId: number;
  state: ConversationState;
  followupStage: number;
  lastUserMsgAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  msgId: number;
  convId: number;
  role: AutoReplyMessageRole;
  textContent: string;
  byBot: boolean;
  createdAt: string;
}
