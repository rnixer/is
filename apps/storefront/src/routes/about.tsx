import { createFileRoute, Link } from '@tanstack/react-router';
export const Route = createFileRoute('/about')({
  head: () => ({ meta: [{ title: 'Our story — igh.ess' }] }),
  component: About,
});
function About() {
  return (
    <main className="story-page section">
      <span className="eyebrow">IGH.ESS / OUR STORY</span>
      <h1>
        Good pieces.
        <br />
        <em>New possibilities.</em>
      </h1>
      <div className="story-body">
        <img src="/images/brand/logo.webp" width="140" height="140" alt="โลโก้ igh.ess" />
        <div>
          <h2>ชิ้นเดิม เรื่องราวใหม่</h2>
          <p>
            igh.ess นำเสื้อมือสองมารีเมคเป็นทรงครอป ให้เสื้อแต่ละชิ้นได้เริ่มต้นอีกครั้งในมุมมองใหม่
          </p>
          <p>
            เราซัก อบ รีด และฆ่าเชื้อให้พร้อมใส่ เสื้อแต่ละชิ้นมีเพียงตัวเดียว
            พร้อมขนาดจริงให้คุณเลือกชิ้นที่เหมาะกับตัวเอง
          </p>
          <Link to="/shop" className="text-link">
            EXPLORE THE PIECES →
          </Link>
        </div>
      </div>
    </main>
  );
}
