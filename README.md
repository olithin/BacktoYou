# Back to You — Site + Admin

Run:
```bash
npm install
npm start
```

Open:
- Site: http://localhost:8080/ru/
- Admin: http://localhost:8080/admin/

Data:
- `content.json` (edited by admin)
- `public/uploads/` (uploaded images)

Replace portrait:
- Put your real image at `public/img/lada_1.png` (same filename).


Admin auth:
- Username: `admin`
- Password: `p0o9P)O(`

The admin uses HTTP Basic Auth (browser will prompt once). You can override via env vars:
```bash
ADMIN_USER=admin ADMIN_PASS='p0o9P)O(' npm start
```

Images:
- Uploads are cropped to **4:5** in the admin before saving, so the site never stretches or breaks.
