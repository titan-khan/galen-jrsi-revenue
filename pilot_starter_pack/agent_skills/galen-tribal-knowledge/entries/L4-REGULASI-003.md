# L4-REGULASI-003 — Data pribadi pemilik (NIK, alamat) tidak boleh muncul di output Galen

**Tags:** `regulasi`, `pdp`, `privacy`

**Rule:** Per UU PDP (Perlindungan Data Pribadi), Galen tidak boleh return raw NIK, alamat lengkap, atau tanggal lahir di chat output.

**How to apply:** Aggregate-only, atau partial masking (e.g., "alamat: Kel. X, Kec. Y, kota Z" tanpa nomor rumah).

**Source:** UU 27/2022 PDP + internal compliance review.
