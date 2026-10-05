# igh.ess

เว็บไซต์เสื้อมือสองรีเมคสำหรับร้าน igh.ess: TanStack Start / Router / Query, React, TypeScript, Strapi 5, PostgreSQL และ Stripe Checkout

หน้าแรกแบบ editorial, ร้าน/ค้นหา/หมวดหมู่, หน้าสินค้าและขนาดจริง, ตะกร้า, guest checkout และสถานะออเดอร์ รองรับสินค้าเฉพาะชิ้นจำนวน 1 ตัว และค่าส่ง 30 บาทต่อออเดอร์ทั่วประเทศไทย ใช้โลโก้จริงของแบรนด์

นำเข้าโพสต์ Instagram วันที่ 1 กรกฎาคม–5 ตุลาคม 2026 เป็น **163 ฉบับร่าง พร้อมรูปสินค้า 170 รูป** ใน Strapi (93 caption ระบุ SOLD) เจ้าของร้านตรวจ/แก้/ลบแล้วเผยแพร่เองได้ ไม่มี Instagram API หรือระบบซิงค์

## เริ่มรัน

ต้องมี Node 24 และ Docker Desktop ที่เปิดอยู่

```powershell
npm.cmd ci
npm.cmd run setup
npm.cmd run db:up
npm.cmd run dev
```

- เว็บ: http://localhost:3000
- Strapi Admin: http://localhost:1337/admin — สร้างบัญชีผู้ดูแลครั้งแรกเอง
- เครื่องใหม่ต้องรัน `npm.cmd run migrate:import` ก่อน โดยหยุด CMS ระหว่าง import

เริ่มในโหมดดูฉบับร่างเฉพาะ development เพื่อทดลองเว็บและตะกร้า Backend รับชำระเฉพาะสินค้าที่ผ่านการตรวจและ Publish แล้ว Stripe ต้องใส่ test secret key และ webhook signing secret ในไฟล์ `.env` ฝั่ง CMS ก่อนทดสอบชำระเงินจริงผ่านระบบทดสอบ

## คู่มือ

- [คู่มือเจ้าของร้าน](docs/owner-guide.md)
- [ติดตั้ง / นำเข้า / Stripe / ทดสอบ](docs/development.md)
- [แผนสถาปัตยกรรมต้นทาง](docs/architecture.md)

```powershell
npm.cmd run typecheck
npm.cmd test
python -m unittest tests/test_migration.py
npm.cmd run build
node tools/verify-browser.mjs
```

โค้ดจองสินค้าใช้ transaction/row locking ใน PostgreSQL ราคาและค่าส่งคำนวณฝั่ง server webhook ตรวจ signature/ยอดเงินและทำงานซ้ำได้โดยไม่ตัดสต็อกซ้ำ มีงานตรวจรายการหมดเวลาและสถานะผิดปกติ

เก็บ export ส่วนตัวไว้ที่ `../instagram-igh.ess-2026-10-05-LIWwNEpM` นอก repository และมีกฎ ignore ป้องกันการนำเข้า Git เก็บเฉพาะ caption สาธารณะ/ข้อมูลนำเข้า/รูปสินค้าที่ใช้ในโปรเจค ไม่มีข้อความส่วนตัวหรือข้อมูลบัญชี Instagram ใน Git ฐานข้อมูลและ Strapi uploads อยู่ในเครื่องและไม่ถูก commit

การส่งงานครั้งนี้เป็นระบบทดลองในเครื่อง ยังไม่ได้ deploy หรือเปิดรับเงิน live งบที่กำหนด 1,000–2,000 บาทต่อปีต้องประเมินโฮสติ้ง backend/ฐานข้อมูล/backup/domain ก่อนเปิดบริการจริง
