# AVTOmaktabb - Aqlli Haydovchilar Maktabi Tizimi

## Loyiha haqida

AVTOmaktabb - bu zamonaviy haydovchilar maktabi uchun yaratilgan to'liq funksional boshqaruv tizimi. U o'qituvchilar, o'quvchilar va administratorlar uchun qulay interfeys taqdim etadi.

## Asosiy xususiyatlar

### 🎓 O'quvchilar uchun
- Testlarni topshirish va natijalarni ko'rish
- Xatoliklarni tahlil qilish
- Kategoriyalashtirilgan testlar
- Tasodifiy testlar
- Shaxsiy kabinet va statistika

### 👨‍🏫 O'qituvchilar uchun
- O'quvchilarni boshqarish
- Test topshiriqlarini yaratish
- Natijalarni ko'rish va tahlil qilish
- Kategoriyalashtirilgan test to'plamlari
- O'quvchilarga topshiriqlar berish

### 👔 Administrator uchun
- Foydalanuvchilarni boshqarish (o'qituvchi, o'quvchi)
- Test biletlarini yaratish va tahrirlash
- Mavzularni boshqarish
- Tizim sozlamalari
- To'liq statistika

## Texnologiyalar

- **Frontend**: React 18, TypeScript, Vite
- **UI/UX**: shadcn/ui, Tailwind CSS, Radix UI
- **Backend**: Supabase (Database + Authentication)
- **State Management**: React Query, Context API
- **Routing**: React Router v6

## O'rnatish va ishga tushirish

### Talablar
- Node.js 18+
- npm yoki yarn

### Qadamlar

```bash
# 1. Repositoryni kloning
git clone <repository-url>
cd AVTOmaktabb

# 2. Dependencieslarni o'rnating
npm install

# 3. .env faylini yarating va to'ldiring
cp .env.example .env
# .env fayliga Supabase ma'lumotlarini kiriting

# 4. Development serverni ishga tushiring
npm run dev
```

### Muhit o'zgaruvchilari (.env)

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Tuzilma

```
src/
├── components/       # UI komponentlar
├── contexts/        # React contextlar
├── hooks/           # Custom hooklar
├── lib/             # Util funksiyalar
├── pages/           # Sahifalar
│   ├── admin/       # Admin sahifalari
│   ├── teacher/     # O'qituvchi sahifalari
│   └── student/     # O'quvchi sahifalari
└── integrations/    # Supabase integratsiyasi
```

## Foydalanuvchi rollari

### Admin
- Tizimni to'liq boshqarish
- Foydalanuvchilarni qo'shish/o'chirish
- Testlarni boshqarish
- Statistikani ko'rish

### O'qituvchi
- O'quvchilarga topshiriqlar berish
- Natijalarni ko'rish
- Test to'plamlarini yaratish
- O'z o'quvchilarini boshqarish

### O'quvchi
- Testlarni topshirish
- O'z natijalarini ko'rish
- Xatoliklarni tahlil qilish
- Shaxsiy statistikani kuzatish

## Database sxemasi

Tizim quyidagi asosiy jadvallardan iborat:
- `users` - Foydalanuvchilar
- `user_roles` - Foydalanuvchi rollari
- `profiles` - Foydalanuvchi profillari
- `tickets` - Test biletlari
- `topics` - Test mavzulari
- `test_results` - Test natijalari
- `assignments` - Topshiriqlar
- `notifications` - Bildirishnomalar

## Deploy qilish

### Vercel
```bash
npm run build
# Build qilingan fayllarni Vercel'ga yuklang
```

### Netlify
```bash
npm run build
# dist/ papkasini Netlify'ga yuklang
```

## Contributing

1. Repositoryni fork qiling
2. Feature branch yarating (`git checkout -b feature/amazing-feature`)
3. O'zgarishlarni commit qiling (`git commit -m 'Add some amazing feature'`)
4. Branchga push qiling (`git push origin feature/amazing-feature`)
5. Pull request yarating

## Litsenziya

Bu loyiha MIT litsenziyasi ostida tarqatiladi.

## Aloqa

- Email: samandar@avto.uz
- Telegram: @samandar_avto

---

**AVTOmaktabb** - Kelajak avtomaktabi boshqaruv tizimi