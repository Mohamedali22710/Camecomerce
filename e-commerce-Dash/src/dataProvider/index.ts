import { DataProvider } from 'react-admin';
import { getAuthHeaders, fetchWithRefresh } from '../auth';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3007/v1';

const resourcePath: Record<string, string> = {
  categories: 'category/admin',
  subcategories: 'subcategory/admin',
  products: 'products/admin',
  orders: 'order/admin',
  users: 'user',
};

const getPath = (resource: string) => resourcePath[resource] || resource;

const toId = (record: any) => {
  if (!record) return record;
  const { _id, ...rest } = record;
  return { id: _id || record.id, ...rest };
};

const handleRes = async (res: Response) => {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const err = new Error(body.message || `HTTP ${res.status}`) as any;
    err.status = res.status;
    throw err;
  }
  return res.json();
};

const extractList = (data: any, resource: string) => {
  if (!data) return { records: [], total: 0 };
  if (Array.isArray(data)) return { records: data, total: data.length };
  if (Array.isArray(data.products)) return { records: data.products, total: data.total ?? data.products.length };
  if (Array.isArray(data.orders)) return { records: data.orders, total: data.total ?? data.orders.length };
  if (Array.isArray(data.categories)) return { records: data.categories, total: data.total ?? data.categories.length };
  if (Array.isArray(data.subcategories)) return { records: data.subcategories, total: data.total ?? data.subcategories.length };
  if (Array.isArray(data.users)) return { records: data.users, total: data.total ?? data.users.length };
  if (Array.isArray(data[resource])) return { records: data[resource], total: data.total ?? data[resource].length };
  return { records: [], total: 0 };
};

const isFileOrBlob = (val: any): boolean =>
  val instanceof File || val instanceof Blob;

const extractRawFile = (val: any): File | Blob | null => {
  if (isFileOrBlob(val)) return val;
  if (val && typeof val === 'object' && isFileOrBlob(val.rawFile)) {
    return val.rawFile;
  }
  return null;
};

const hasAnyFileUpload = (data: Record<string, any>): boolean => {
  if (!data || typeof data !== 'object') return false;
  return Object.values(data).some(v => {
    if (extractRawFile(v)) return true;
    if (Array.isArray(v) && v.some(item => extractRawFile(item))) return true;
    return false;
  });
};

const buildFormData = (data: Record<string, any>, excludeId = false): FormData => {
  const fd = new FormData();
  for (const [k, v] of Object.entries(data)) {
    if (excludeId && k === 'id') continue;
    if (v === undefined || v === null) continue;

    // 1. Single file: direct File or { rawFile: File }
    const singleFile = extractRawFile(v);
    if (singleFile) {
      fd.append(k, singleFile);
      continue;
    }

    // 2. Array
    if (Array.isArray(v)) {
      const hasFiles = v.some(item => extractRawFile(item));
      if (hasFiles) {
        v.forEach(item => {
          const f = extractRawFile(item);
          if (f) {
            fd.append(k, f);
          }
        });
      } else {
        fd.append(k, JSON.stringify(v));
      }
      continue;
    }

    // 3. Object (that is not a file wrapper)
    if (typeof v === 'object') {
      if ('src' in v && typeof (v as any).src === 'string' && !(v as any).rawFile) {
        if (k === 'image') {
          fd.append('imageURL', (v as any).src);
        }
        continue;
      }
      fd.append(k, JSON.stringify(v));
      continue;
    }

    // 4. Primitive
    fd.append(k, String(v));
  }
  return fd;
};

const createProvider = (): DataProvider => ({
  getList: async (resource, params) => {
    const { page = 1, perPage = 10 } = params.pagination || {};
    const { field, order } = params.sort || {};

    const qs = new URLSearchParams();
    qs.set('page', String(page));
    qs.set('limit', String(perPage));
    // Never send sort=id_asc/desc because the backend only accepts specific allowed fields
    if (field && order && field !== 'id') {
      qs.set('sort', `${field}_${order.toLowerCase()}`);
    }
    if (params.filter) {
      for (const [k, v] of Object.entries(params.filter)) {
        if (v !== undefined && v !== '' && v !== null) {
          qs.set(k, String(v));
        }
      }
    }

    const url = `${API_URL}/${getPath(resource)}?${qs}`;
    const json = await handleRes(await fetchWithRefresh(url, { headers: getAuthHeaders() }));
    const { records, total } = extractList(json.data, resource);
    return { data: records.map(toId), total };
  },

  getOne: async (resource, params) => {
    const url = `${API_URL}/${getPath(resource)}/${params.id}`;
    const json = await handleRes(await fetchWithRefresh(url, { headers: getAuthHeaders() }));
    return { data: toId(json.data) };
  },

  getMany: async (resource, params) => {
    const rawIds = (params.ids || []).filter(Boolean);
    const ids = Array.from(new Set(rawIds));
    if (ids.length === 0) return { data: [] };
    const results = await Promise.all(
      ids.map(id =>
        fetchWithRefresh(`${API_URL}/${getPath(resource)}/${id}`, { headers: getAuthHeaders() })
          .then(handleRes)
          .then(r => toId(r.data))
          .catch(() => null)
      )
    );
    return { data: results.filter((r): r is any => Boolean(r)) };
  },

  getManyReference: async (resource, params) => {
    const { page = 1, perPage = 10 } = params.pagination || {};
    const { field, order } = params.sort || {};
    const qs = new URLSearchParams();
    qs.set('page', String(page));
    qs.set('limit', String(perPage));
    if (field && order && field !== 'id') {
      qs.set('sort', `${field}_${order.toLowerCase()}`);
    }
    if (params.target && params.id) {
      qs.set(params.target, String(params.id));
    }
    const url = `${API_URL}/${getPath(resource)}?${qs}`;
    const json = await handleRes(await fetchWithRefresh(url, { headers: getAuthHeaders() }));
    const { records, total } = extractList(json.data, resource);
    return { data: records.map(toId), total };
  },

  create: async (resource, params) => {
    const isUpload = hasAnyFileUpload(params.data);
    let body: FormData | string;
    const headers: Record<string, string> = { ...getAuthHeaders() };

    if (isUpload) {
      body = buildFormData(params.data, false);
    } else {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(params.data);
    }

    const url = `${API_URL}/${getPath(resource)}`;
    const json = await handleRes(
      await fetchWithRefresh(url, { method: 'POST', headers, body })
    );
    return { data: toId(json.data) };
  },

  update: async (resource, params) => {
    const isUpload = hasAnyFileUpload(params.data);
    let body: FormData | string;
    const headers: Record<string, string> = { ...getAuthHeaders() };

    if (isUpload) {
      body = buildFormData(params.data, true);
    } else {
      headers['Content-Type'] = 'application/json';
      const { id, ...rest } = params.data;
      body = JSON.stringify(rest);
    }

    const method = resource === 'orders' ? 'PATCH' : 'PUT';
    const url = `${API_URL}/${getPath(resource)}/${params.id}`;
    const json = await handleRes(
      await fetchWithRefresh(url, { method, headers, body })
    );
    return { data: toId(json.data) };
  },

  delete: async (resource, params) => {
    const url = `${API_URL}/${getPath(resource)}/${params.id}`;
    await fetchWithRefresh(url, { method: 'DELETE', headers: getAuthHeaders() });
    return { data: { id: params.id } as any };
  },

  deleteMany: async (resource, params) => {
    await Promise.all(
      params.ids.map(id =>
        fetchWithRefresh(`${API_URL}/${getPath(resource)}/${id}`, {
          method: 'DELETE',
          headers: getAuthHeaders(),
        })
      )
    );
    return { data: params.ids };
  },

  updateMany: async (resource, params) => {
    await Promise.all(
      params.ids.map(id =>
        fetchWithRefresh(`${API_URL}/${getPath(resource)}/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
          body: JSON.stringify(params.data),
        })
      )
    );
    return { data: params.ids };
  },
});

const defaultProvider = createProvider();

export default (_type?: string) => defaultProvider;
