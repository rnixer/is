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
        “IS”
        <br />
        <em className="story-tagline">because everything can still be.</em>
      </h1>
      <div className="story-body">
        <div>
          <h2>igh-ess-IS อ่านว่า “อีส”</h2>
          <p>เพราะเราเชื่อว่าทุกสิ่ง “มีตัวตน” และ “มีความเป็นไปได้” มากกว่าหนึ่งแบบ</p>
          <p>
            เรานำเสื้อผ้าเดิมที่ไม่ใช้แล้ว สุดท้ายกลายเป็นถูกลืมและไม่เหลือคุณค่า
            มาสร้างสรรค์และพัฒนาใหม่ให้กลายเป็นผลิตภัณฑ์ที่มีคุณค่ามากขึ้น
          </p>
          <p>
            เราจึงเปลี่ยนสิ่งที่กำลังจะถูกโยนทิ้ง ให้กลายเป็นอีกสิ่งหนึ่ง ที่ยัง “ไปต่อได้”
            ในเวอร์ชั่นใหม่อีกครั้ง.
          </p>
          <Link to="/shop" className="text-link">
            EXPLORE THE PIECES →
          </Link>
        </div>
      </div>
    </main>
  );
}
