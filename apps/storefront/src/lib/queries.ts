import { queryOptions } from '@tanstack/react-query';
import { getCatalog } from './api.functions';
export const catalogQuery = () =>
  queryOptions({ queryKey: ['catalog'], queryFn: () => getCatalog(), staleTime: 60000 });
