// -----------------------------------------------------------------------------
// Paging
//
// Supabase returns at most 1000 rows per request, so tables that grow with
// class size are read page by page until a short page comes back.
// -----------------------------------------------------------------------------

import type { PostgrestError } from "@supabase/supabase-js";

const PAGE_SIZE = 1000;

type PageQuery<T> = (
  from: number,
  to: number,
) => PromiseLike<{ data: T[] | null; error: PostgrestError | null }>;

// Runs the query for rows 0-999, 1000-1999 and so on, and returns every row.
// Throws the Supabase error if any page fails.
export async function fetchAllRows<T>(pageQuery: PageQuery<T>): Promise<T[]> {
  const rows: T[] = [];

  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await pageQuery(from, from + PAGE_SIZE - 1);

    if (error) {
      throw error;
    }

    rows.push(...(data ?? []));

    if (!data || data.length < PAGE_SIZE) {
      return rows;
    }
  }
}
