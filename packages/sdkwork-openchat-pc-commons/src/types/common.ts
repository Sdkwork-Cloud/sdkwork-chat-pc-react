



export interface ApiResponse<T = unknown> {
  code: number;
  message: string;
  data: T;
  timestamp?: number;
}


export interface PageQuery {
  page: number;
  size: number;
  sort?: string;
  order?: 'asc' | 'desc';
}


export interface PageResult<T = unknown> {
  records: T[];
  total: number;
  page: number;
  size: number;
  pages: number;
}


export type PageResponse<T> = ApiResponse<PageResult<T>>;



export interface BaseComponentProps {
  
  className?: string;
  
  style?: React.CSSProperties;
  
  children?: React.ReactNode;
}


export interface BaseFormProps<T = unknown> extends BaseComponentProps {
  
  value?: T;
  
  defaultValue?: T;
  
  onChange?: (value: T) => void;
  
  disabled?: boolean;
  
  readOnly?: boolean;
  
  placeholder?: string;
}


export interface BaseListProps<T = unknown> extends BaseComponentProps {
  
  dataSource: T[];
  
  loading?: boolean;
  
  emptyText?: string;
  
  onItemClick?: (item: T, index: number) => void;
}



export interface PaginationChangeEvent {
  page: number;
  size: number;
}


export interface SortChangeEvent {
  field: string;
  order: 'asc' | 'desc' | null;
}


export interface FilterChangeEvent {
  [key: string]: unknown;
}



export interface TableColumn<T = unknown> {
  
  key: string;
  
  title: string;
  
  dataIndex?: keyof T | string;
  
  width?: number | string;
  
  fixed?: 'left' | 'right';
  
  align?: 'left' | 'center' | 'right';
  
  sortable?: boolean;
  
  render?: (value: unknown, record: T, index: number) => React.ReactNode;
  
  cellClassName?: string | ((record: T, index: number) => string);
}


export interface TableRowSelection<T = unknown> {
  
  selectedRowKeys?: string[];
  
  onChange?: (selectedRowKeys: string[], selectedRows: T[]) => void;
  
  multiple?: boolean;
  
  showSelectAll?: boolean;
}


export interface TablePagination {
  
  page?: number;
  
  size?: number;
  
  total?: number;
  
  pageSizeOptions?: number[];
  
  showQuickJumper?: boolean;
  
  showTotal?: boolean;
  
  onChange?: (page: number, size: number) => void;
}



export interface UserBaseInfo {
  uid: string;
  nickname: string;
  avatar?: string;
  status?: 'online' | 'offline' | 'busy';
}


export interface ConversationBaseInfo {
  id: string;
  name: string;
  avatar?: string;
  type: 'single' | 'group';
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount: number;
}


export interface MessageBaseInfo {
  id: string;
  conversationId: string;
  senderId: string;
  type: 'text' | 'image' | 'file' | 'voice';
  content: string;
  timestamp: number;
  status: 'sending' | 'sent' | 'read' | 'failed';
}



export type Nullable<T> = T | null;


export type Optional<T> = T | undefined;


export type AsyncReturnType<T extends (...args: unknown[]) => Promise<unknown>> = 
  T extends (...args: unknown[]) => Promise<infer R> ? R : never;


export type KeyValue<T = unknown> = Record<string, T>;

