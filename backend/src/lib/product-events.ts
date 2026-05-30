type ProductEventName =
  | 'listing_created'
  | 'listing_updated'
  | 'listing_published'
  | 'listing_viewed'
  | 'inquiry_started'
  | 'inquiry_replied'

export function logProductEvent(
  event: ProductEventName,
  payload: Record<string, unknown>,
): void {
  const record = {
    ts: new Date().toISOString(),
    event,
    ...payload,
  }
  console.info('[product-event]', JSON.stringify(record))
}
