import { useEffect, useState } from 'react';
import { getJson } from '../api/client.js';

type ApiItem = Record<string, unknown>;
type LoadState =
  | { status: 'loading' }
  | { status: 'loaded'; items: ApiItem[] }
  | { status: 'error'; message: string };
type Props = {
  title: string;
  description: string;
  endpoint: string;
  dataKey: string;
  emptyMessage: string;
};

function formatValue(value: unknown) {
  if (Array.isArray(value)) return value.join(', ');
  if (value !== null && typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function isApiItem(value: unknown): value is ApiItem {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function CapabilityCard({ title, description, endpoint, dataKey, emptyMessage }: Props) {
  const [state, setState] = useState<LoadState>({ status: 'loading' });

  useEffect(() => {
    let active = true;
    getJson<Record<string, unknown>>(endpoint)
      .then((response) => {
        const items = response[dataKey];
        if (!Array.isArray(items)) {
          throw new Error(`Invalid ${dataKey} response`);
        }
        const apiItems = items.filter(isApiItem);
        if (apiItems.length !== items.length) throw new Error(`Invalid ${dataKey} response`);
        if (active) setState({ status: 'loaded', items: apiItems });
      })
      .catch((error: unknown) => {
        if (active) setState({ status: 'error', message: error instanceof Error ? error.message : 'Unknown error' });
      });

    return () => {
      active = false;
    };
  }, [dataKey, endpoint]);

  return (
    <section className="card h-100">
      <div className="card-body">
        <h2 className="h4">{title}</h2>
        <p>{description}</p>
        {state.status === 'loading' && <p role="status">Loading {title.toLowerCase()}...</p>}
        {state.status === 'error' && <p role="alert">Unable to load {title.toLowerCase()}: {state.message}</p>}
        {state.status === 'loaded' && state.items.length === 0 && <p>{emptyMessage}</p>}
        {state.status === 'loaded' && state.items.length > 0 && (
          <ul className="list-group">
            {state.items.map((item, index) => (
              <li className="list-group-item" key={String(item._id ?? index)}>
                {Object.entries(item).map(([field, value]) => (
                  <span className="me-3" key={field}>
                    <strong>{field}:</strong> {formatValue(value)}
                  </span>
                ))}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
