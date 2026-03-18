

export interface BaseEntity {
  id: string;
  createTime?: number;
  updateTime?: number;
}

export interface Result<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  code?: number;
}

export interface PageQuery {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PageResult<T> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface PageResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface Page<T> {
  content: T[];
  total: number;
  page: number;
  size: number;
  totalPages: number;
}
