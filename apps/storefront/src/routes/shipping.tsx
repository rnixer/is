import { createFileRoute } from '@tanstack/react-router';
export const Route = createFileRoute('/shipping')({
  head: () => ({ meta: [{ title: 'Shipping & returns — igh.ess' }] }),
  component: Shipping,
});
function Shipping() {
  return (
    <main className="section policy-page">
      <span className="eyebrow">THE DETAILS</span>
      <h1>Shipping & returns.</h1>
      <h2>การจัดส่ง</h2>
      <p>จัดส่งเฉพาะประเทศไทย ค่าส่งเหมาจ่าย 30 บาทต่อออเดอร์ ไม่ว่าจะซื้อกี่ชิ้น</p>
      <p>ข้อมูลระยะเวลาจัดส่งและผู้ให้บริการขนส่ง กรุณาสอบถามร้านก่อนสั่งซื้อ</p>
      <h2>การเปลี่ยนและคืนสินค้า</h2>
      <p>
        ตามนโยบายร้าน สินค้าซื้อแล้วไม่รับเปลี่ยนหรือคืนเงิน กรุณาตรวจรูป ขนาด
        และรายละเอียดสินค้าก่อนชำระเงิน หากได้รับสินค้ามีปัญหาหรือไม่ตรงกับคำสั่งซื้อ
        กรุณาติดต่อร้านเพื่อตรวจสอบ
      </p>
      <h2>ติดต่อร้าน</h2>
      <p>
        <a href="https://www.instagram.com/igh.ess/">Instagram @igh.ess</a> ·{' '}
        <a href="https://line.me/R/ti/p/@788yqddr">LINE @788yqddr</a>
      </p>
    </main>
  );
}
