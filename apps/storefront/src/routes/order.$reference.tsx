import { createFileRoute, Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { money } from '@igh/contracts';
import { getOrder } from '../lib/api.functions';
import { useCart } from '../lib/cart';
export const Route = createFileRoute('/order/$reference')({
  head: () => ({
    meta: [{ title: 'Order — igh.ess' }, { name: 'robots', content: 'noindex,nofollow' }],
  }),
  component: Order,
});
function Order() {
  const { reference } = Route.useParams(),
    cart = useCart();
  const query = useQuery({
    queryKey: ['order', reference],
    queryFn: () => getOrder({ data: { reference } }),
    refetchInterval: (q) => (q.state.data?.paymentStatus === 'PENDING_PAYMENT' ? 3000 : false),
    retry: 1,
  });
  const paid = query.data?.paymentStatus === 'PAID';
  useEffect(() => {
    if (paid && cart.ready && query.data)
      for (const item of query.data.items) if (cart.skus.includes(item.sku)) cart.remove(item.sku);
  }, [paid, cart, query.data]);
  const labels: Record<string, string> = {
    PENDING_PAYMENT: 'กำลังรอยืนยันการชำระเงิน',
    PAID: 'ได้รับการชำระเงินแล้ว',
    EXPIRED: 'รายการชำระเงินหมดอายุ',
    PAYMENT_REVIEW: 'ร้านกำลังตรวจสอบรายการชำระเงิน',
  };
  return (
    <main className="section order-page">
      <span className="eyebrow">YOUR NEXT CHAPTER</span>
      <h1>{paid ? 'Thank you.' : 'Your order.'}</h1>
      {query.isPending ? (
        <p role="status">กำลังตรวจสอบคำสั่งซื้อ…</p>
      ) : query.isError ? (
        <p role="alert">{query.error.message}</p>
      ) : (
        <>
          <p className="order-state" role="status">
            {labels[query.data.paymentStatus] || 'กำลังตรวจสอบ'}
          </p>
          <p className="small">เลขคำสั่งซื้อ {reference}</p>
          <div className="order-receipt">
            {query.data.items.map((item) => (
              <div key={item.sku}>
                <span>{item.name}</span>
                <span>{money(item.priceSatang)}</span>
              </div>
            ))}
            <div className="total">
              <strong>รวมค่าส่ง</strong>
              <strong>{money(query.data.totalSatang)}</strong>
            </div>
          </div>
          {query.data.trackingNumber && <p>เลขติดตามพัสดุ: {query.data.trackingNumber}</p>}
          <p>
            {paid
              ? 'ร้านจะดำเนินการจัดส่งให้คุณ'
              : 'สถานะจะเปลี่ยนเมื่อระบบได้รับการยืนยันจาก Stripe'}
          </p>
        </>
      )}
      <Link to="/shop" className="button dark">
        CONTINUE EXPLORING →
      </Link>
    </main>
  );
}
