import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

interface RequestOptions {
  method: string;
  body?: string;
  headers?: Record<string, string>;
}

export async function apiRequest(
  urlOrOptions: string | RequestOptions,
  options?: RequestOptions,
): Promise<Response> {
  let url: string;
  let fetchOptions: RequestInit = {
    credentials: "include"
  };
  
  // Handle the different parameter formats
  if (typeof urlOrOptions === 'string') {
    // Old format: apiRequest(url, { method, data })
    url = urlOrOptions;
    
    if (options) {
      fetchOptions.method = options.method;
      
      if (options.body) {
        fetchOptions.body = options.body;
        fetchOptions.headers = {
          "Content-Type": "application/json",
          ...options.headers
        };
      }
    }
  } else {
    // New format: apiRequest({ method, body, headers })
    if (!options) {
      throw new Error("URL is required when using options object as first parameter");
    }
    
    url = options as unknown as string;
    fetchOptions.method = urlOrOptions.method;
    
    if (urlOrOptions.body) {
      fetchOptions.body = urlOrOptions.body;
      fetchOptions.headers = {
        "Content-Type": "application/json",
        ...urlOrOptions.headers
      };
    }
  }
  
  // If url is relative, prepend with the base URL using port 3333
  if (url.startsWith('/')) {
    const protocol = window.location.protocol;
    const hostname = window.location.hostname;
    url = `${protocol}//${hostname}:3333${url}`;
  }
  
  const res = await fetch(url, fetchOptions);
  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    let url = queryKey[0] as string;
    
    // If url is relative, prepend with the base URL using port 3333
    if (url.startsWith('/')) {
      const protocol = window.location.protocol;
      const hostname = window.location.hostname;
      url = `${protocol}//${hostname}:3333${url}`;
    }
    
    const res = await fetch(url, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
