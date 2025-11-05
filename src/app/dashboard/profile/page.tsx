'use client';

import { useEffect, useState } from 'react';
import { supabase, getSessionWithTimeout } from '@/lib/supabaseClient';
import Link from 'next/link';
import { uploadImage } from '@/lib/utils/imageUpload';
import { PY_DEPARTMENTS, getCities } from '@/lib/location/pyLocations';

type Category = { id: string; name: string };

export default function ProfileEditPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [savingStep, setSavingStep] = useState<string | null>(null);
  
  // Datos del perfil
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [bio, setBio] = useState('');
  const [department, setDepartment] = useState<string>('');
  const [city, setCity] = useState<string>('');
  const [neighborhood, setNeighborhood] = useState<string>('');
  const [addressNote, setAddressNote] = useState<string>('');
  const [latitude, setLatitude] = useState<number | undefined>(undefined);
  const [longitude, setLongitude] = useState<number | undefined>(undefined);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [currentAvatar, setCurrentAvatar] = useState<string | null>(null);
  const [currentCover, setCurrentCover] = useState<string | null>(null);

  // Datos de la tienda (solo si está activa)
  const [hasActiveStore, setHasActiveStore] = useState(false);
  const [storeId, setStoreId] = useState<string | null>(null);
  // storeName removido - se genera automáticamente desde el perfil
  const [storeDescription, setStoreDescription] = useState('');
  const [storeContactPhone, setStoreContactPhone] = useState('');
  const [storeContactEmail, setStoreContactEmail] = useState('');
  const [storeDepartment, setStoreDepartment] = useState<string>('');
  const [storeCity, setStoreCity] = useState<string>('');
  const [storeNeighborhood, setStoreNeighborhood] = useState<string>('');
  const [storeAddressNote, setStoreAddressNote] = useState<string>('');
  const [storeLatitude, setStoreLatitude] = useState<number | undefined>(undefined);
  const [storeLongitude, setStoreLongitude] = useState<number | undefined>(undefined);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [session, setSession] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      // Cargar sesión
      let { data: session } = await supabase.auth.getSession();
      if (!session?.session?.user?.id) {
        const res = await getSessionWithTimeout();
        session = res.data;
      }
      if (!session?.session?.user?.id) {
        throw new Error('No estás autenticado');
      }

      const userId = session.session.user.id;
      setSession(session); // Guardar session para usarla en el renderizado

      // Cargar perfil
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('first_name, last_name, phone, bio, avatar_url, cover_url, department, city, neighborhood, address_note, latitude, longitude')
        .eq('id', userId)
        .single();

      if (profileError && profileError.code !== 'PGRST116') throw profileError;

      if (profile) {
        const p: any = profile as any;
        setFirstName(p.first_name || '');
        setLastName(p.last_name || '');
        setPhone(p.phone || '');
        setBio(p.bio || '');
        setDepartment(p.department || '');
        setCity(p.city || '');
        setNeighborhood(p.neighborhood || '');
        setAddressNote(p.address_note || '');
        setLatitude(p.latitude ?? undefined);
        setLongitude(p.longitude ?? undefined);
        setCurrentAvatar(p.avatar_url || null);
        setCurrentCover(p.cover_url || null);
      }

      // Cargar tienda si existe y está activa
      const { data: store, error: storeError } = await supabase
        .from('stores')
        .select('*')
        .eq('seller_id', userId)
        .maybeSingle();

      if (storeError && storeError.code !== 'PGRST116') {
        console.warn('Error cargando tienda:', storeError);
      }

        if (store) {
        const s: any = store as any;
        const isActive = s.is_active === true;
        
        setHasActiveStore(isActive);
        setStoreId(s.id);
        
        if (isActive) {
          // Solo cargar datos de tienda si está activa
          // No cargar storeName - se generará automáticamente desde el perfil
          setStoreDescription(s.description || '');
          setStoreContactPhone(s.contact_phone || '');
          setStoreContactEmail(s.contact_email || '');
          setStoreDepartment(s.department || '');
          setStoreCity(s.city || '');
          setStoreNeighborhood(s.neighborhood || '');
          setStoreAddressNote(s.address_note || '');
          setStoreLatitude(s.latitude ?? undefined);
          setStoreLongitude(s.longitude ?? undefined);
          setSelectedCategories((s.category_ids as string[]) || []);
        }
      }

      // Cargar categorías
      const { data: catsData } = await supabase
        .from('categories')
        .select('id, name')
        .eq('is_active', true)
        .order('name');
      
      if (catsData) {
        setCategories(catsData);
      }
    } catch (err: any) {
      console.error('Error cargando datos:', err);
      showMsg('error', err.message || 'Error al cargar los datos');
    } finally {
      setLoading(false);
    }
  }

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  }

  function handleCoverChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setCoverFile(file);
      setCoverPreview(URL.createObjectURL(file));
    }
  }


  function toggleCategory(categoryId: string) {
    setSelectedCategories(prev => 
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  }

  function showMsg(type: 'success' | 'error', text: string) {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 5000);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    setSavingStep('Preparando…');

    try {
      let { data: session } = await supabase.auth.getSession();
      if (!session?.session?.user?.id) {
        const res = await getSessionWithTimeout();
        session = res.data;
      }
      if (!session?.session?.user?.id) {
        throw new Error('No estás autenticado');
      }

      const userId = session.session.user.id;

      // 1. Actualizar perfil
      setSavingStep('Subiendo imágenes del perfil…');
      let avatarUrl = currentAvatar;
      let coverUrl = currentCover;

      if (avatarFile) {
        try {
          setSavingStep('Subiendo foto de perfil…');
          avatarUrl = await uploadImage(avatarFile, 'profiles', 'avatars');
        } catch (imgErr: any) {
          console.error('⚠️ Error subiendo avatar:', imgErr);
        }
      }

      if (coverFile) {
        try {
          setSavingStep('Subiendo imagen de portada del perfil…');
          coverUrl = await uploadImage(coverFile, 'profiles', 'covers');
        } catch (imgErr: any) {
          console.error('⚠️ Error subiendo cover:', imgErr);
        }
      }

      setSavingStep('Guardando datos del perfil…');
      const { error: profileError } = await (supabase as any)
        .from('profiles')
        .update({
          first_name: firstName.trim() || null,
          last_name: lastName.trim() || null,
          phone: phone.trim() || null,
          bio: bio.trim() || null,
          avatar_url: avatarUrl,
          cover_url: coverUrl,
          department: department || null,
          city: city || null,
          neighborhood: neighborhood.trim() || null,
          address_note: addressNote.trim() || null,
          latitude: typeof latitude === 'number' ? latitude : null,
          longitude: typeof longitude === 'number' ? longitude : null,
        })
        .eq('id', userId);

      if (profileError) throw new Error(`Error al actualizar perfil: ${profileError.message}`);

      // 2. Si tiene tienda activa, actualizar tienda (usa las mismas imágenes y nombre del perfil)
      if (hasActiveStore && storeId) {
        // Generar nombre de tienda desde el nombre del perfil
        // Usar la sesión que ya obtuvimos arriba
        const profileFullName = `${firstName.trim()} ${lastName.trim()}`.trim();
        const storeDisplayName = profileFullName || session?.session?.user?.email?.split('@')[0] || 'Tienda';
        
        if (!storeDisplayName) {
          throw new Error('El nombre del perfil es requerido para la tienda');
        }

        setSavingStep('Guardando datos de la tienda…');
        const slug = storeDisplayName
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '');

        // Usar las mismas imágenes del perfil para la tienda y sincronizar el nombre
        const { error: storeError } = await (supabase as any)
          .from('stores')
          .update({
            name: storeDisplayName, // Nombre unificado con el perfil
            slug: slug,
            description: storeDescription.trim() || null,
            contact_phone: storeContactPhone.trim() || null,
            contact_email: storeContactEmail.trim() || null,
            department: storeDepartment || null,
            city: storeCity || null,
            neighborhood: storeNeighborhood.trim() || null,
            address_note: storeAddressNote.trim() || null,
            latitude: typeof storeLatitude === 'number' ? storeLatitude : null,
            longitude: typeof storeLongitude === 'number' ? storeLongitude : null,
            // Usar las mismas imágenes del perfil
            logo_url: avatarUrl,
            cover_image_url: coverUrl,
            category_ids: selectedCategories.length > 0 ? selectedCategories : null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', storeId);

        if (storeError) throw new Error(`Error al actualizar tienda: ${storeError.message}`);
      }

      showMsg('success', '✅ Perfil actualizado exitosamente');
      
      // Limpiar previews
      if (avatarPreview) URL.revokeObjectURL(avatarPreview);
      if (coverPreview) URL.revokeObjectURL(coverPreview);
      
      setAvatarFile(null);
      setCoverFile(null);
      setAvatarPreview(null);
      setCoverPreview(null);
      
      await loadData();
    } catch (err: any) {
      console.error('❌ Error guardando:', err);
      showMsg('error', err.message || 'Error al guardar');
    } finally {
      setSaving(false);
      setSavingStep(null);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 p-6">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Mi Perfil {hasActiveStore && '& Tienda'}</h1>
        <Link href="/dashboard" className="underline text-sm">← Volver al Dashboard</Link>
      </div>

      {hasActiveStore && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-2 text-green-800">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="font-medium">Tu tienda está activa y visible públicamente.</span>
          </div>
        </div>
      )}

      {msg && (
        <div className={`mb-4 p-3 rounded ${
          msg.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          {msg.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="max-w-4xl space-y-8">
        {/* SECCIÓN: PERFIL PERSONAL */}
        <div className="bg-white border rounded-xl p-6 shadow-sm">
          <h2 className="text-xl font-semibold mb-6 pb-3 border-b">👤 Información Personal</h2>
          
          {/* Imagen de portada del perfil */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">Imagen de portada de perfil</label>
            <div className="relative h-48 bg-gray-100 rounded-lg overflow-hidden border-2 border-dashed border-gray-300">
              {(coverPreview || currentCover) ? (
                <div className="relative w-full h-full">
                  <img
                    src={coverPreview || currentCover || ''}
                    alt="Portada"
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setCoverFile(null);
                      setCoverPreview(null);
                      setCurrentCover(null);
                    }}
                    className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600"
                    title="Eliminar imagen"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 gap-2">
                  <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="text-sm">Sin imagen de portada</span>
                </div>
              )}
            </div>
            <label
              htmlFor="cover-upload"
              className={`mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer ${
                saving 
                  ? 'bg-gray-300 text-gray-600 cursor-not-allowed' 
                  : 'bg-blue-600 text-white hover:bg-blue-700 border-2 border-blue-600'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              {currentCover ? 'Cambiar portada' : 'Subir portada'}
            </label>
            <input
              id="cover-upload"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleCoverChange}
              className="hidden"
              disabled={saving}
            />
            <p className="text-xs text-gray-500 mt-2">JPG, PNG, WEBP • Máx 5MB</p>
          </div>

          {/* Avatar */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">Foto de perfil</label>
            <div className="flex items-center gap-6">
              <div className={`relative w-32 h-32 rounded-full bg-gray-100 overflow-hidden flex-shrink-0 border-4 shadow-md ${
                hasActiveStore ? 'border-gray-200' : 'border-gray-600 sm:border-gray-200'
              }`}>
                {(avatarPreview || currentAvatar) ? (
                  <div className="relative w-full h-full">
                    <img
                      src={avatarPreview || currentAvatar || ''}
                      alt="Avatar"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setAvatarFile(null);
                        setAvatarPreview(null);
                        setCurrentAvatar(null);
                      }}
                      className="absolute top-0 right-0 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                      title="Eliminar foto"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400 text-4xl">
                    👤
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <label
                  htmlFor="avatar-upload"
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer ${
                    saving 
                      ? 'bg-gray-300 text-gray-600 cursor-not-allowed' 
                      : 'bg-blue-600 text-white hover:bg-blue-700 border-2 border-blue-600'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  {currentAvatar ? 'Cambiar foto' : 'Subir foto de perfil'}
                </label>
                <input
                  id="avatar-upload"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleAvatarChange}
                  className="hidden"
                  disabled={saving}
                />
                <p className="text-xs text-gray-500">JPG, PNG, WEBP • Máx 5MB</p>
              </div>
            </div>
          </div>

          {/* Nombre y Apellido */}
          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-1">Nombre *</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="border p-2 w-full rounded focus:ring-2 focus:ring-blue-500"
                placeholder="Tu nombre"
                required
                disabled={saving}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Apellido</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="border p-2 w-full rounded focus:ring-2 focus:ring-blue-500"
                placeholder="Tu apellido"
                disabled={saving}
              />
            </div>
          </div>

          {/* Teléfono */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Teléfono</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="border p-2 w-full rounded focus:ring-2 focus:ring-blue-500"
              placeholder="0981234567"
              disabled={saving}
            />
          </div>

          {/* Ubicación del perfil */}
          <div className="grid md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-1">Departamento</label>
              <select
                className="border p-2 w-full rounded focus:ring-2 focus:ring-blue-500"
                value={department}
                onChange={(e) => {
                  setDepartment(e.target.value);
                  setCity('');
                }}
                disabled={saving}
              >
                <option value="">— Selecciona —</option>
                {PY_DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Ciudad</label>
              <select
                className="border p-2 w-full rounded focus:ring-2 focus:ring-blue-500"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                disabled={saving || !department}
              >
                <option value="">— Selecciona —</option>
                {getCities(department).map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Barrio</label>
              <input
                type="text"
                className="border p-2 w-full rounded focus:ring-2 focus:ring-blue-500"
                placeholder="Barrio"
                value={neighborhood}
                onChange={(e) => setNeighborhood(e.target.value)}
                disabled={saving}
              />
            </div>
          </div>

          {/* Dirección y geolocalización */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Referencia / Dirección</label>
            <input
              type="text"
              className="border p-2 w-full rounded focus:ring-2 focus:ring-blue-500"
              placeholder="Calle, número, referencia (opcional)"
              value={addressNote}
              onChange={(e) => setAddressNote(e.target.value)}
              disabled={saving}
            />
            <div className="flex items-center gap-3 mt-2">
              <button
                type="button"
                className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                  saving 
                    ? 'bg-gray-300 text-gray-600' 
                    : 'bg-gray-800 text-white hover:bg-black'
                }`}
                disabled={saving}
                onClick={() => {
                  if (!navigator.geolocation) {
                    alert('Tu navegador no soporta geolocalización');
                    return;
                  }
                  navigator.geolocation.getCurrentPosition(
                    (pos) => {
                      setLatitude(pos.coords.latitude);
                      setLongitude(pos.coords.longitude);
                    },
                    () => alert('No se pudo obtener tu ubicación'),
                    { enableHighAccuracy: true, timeout: 8000 }
                  );
                }}
              >
                📍 Usar mi ubicación
              </button>
              {(latitude && longitude) ? (
                <span className="text-xs text-gray-600">{latitude.toFixed(5)}, {longitude.toFixed(5)}</span>
              ) : (
                <span className="text-xs text-gray-500">Opcional</span>
              )}
            </div>
          </div>

          {/* Biografía */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Biografía</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="border p-2 w-full rounded min-h-[100px] focus:ring-2 focus:ring-blue-500"
              placeholder="Cuéntanos sobre ti..."
              maxLength={500}
              disabled={saving}
            />
            <p className="text-xs text-gray-500 mt-1">{bio.length}/500 caracteres</p>
          </div>
        </div>

        {/* SECCIÓN: INFORMACIÓN DE LA TIENDA (solo si está activa) */}
        {hasActiveStore && (
          <div className="bg-white border rounded-xl p-6 shadow-sm border-blue-200 border-2">
            <h2 className="text-xl font-semibold mb-6 pb-3 border-b flex items-center gap-2">
              🏪 Información de la Tienda
              <span className="text-sm font-normal text-green-600">(Activa)</span>
            </h2>

            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800 flex items-start gap-2">
                <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>
                  <strong>Imágenes de la tienda:</strong> La tienda utiliza las mismas imágenes de tu perfil. 
                  Tu <strong>foto de perfil</strong> se usará como logo de la tienda y tu <strong>portada de perfil</strong> como portada de la tienda. 
                  Actualiza las imágenes en la sección "Información Personal" para cambiar las de la tienda.
                </span>
              </p>
            </div>

            {/* Nombre de la tienda (generado automáticamente desde el perfil) */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2 text-gray-700">Nombre de la tienda</label>
              <div className="relative">
                <div className="flex items-center gap-3 bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-200 rounded-lg px-4 py-3 shadow-sm">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center shadow-md">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-lg font-semibold text-gray-900 truncate">
                      {(() => {
                        const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
                        return fullName || (session?.session?.user?.email?.split('@')[0]) || 'Tienda';
                      })()}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Generado automáticamente desde tu nombre de perfil
                    </p>
                  </div>
                  <div className="flex-shrink-0">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Sincronizado
                    </span>
                  </div>
                </div>
                <div className="mt-2 pl-1">
                  <p className="text-xs text-gray-500 italic">
                    Para cambiar este nombre, actualiza tu <strong className="text-gray-700">Nombre</strong> y <strong className="text-gray-700">Apellido</strong> en la sección "Información Personal"
                  </p>
                </div>
              </div>
            </div>

            {/* Descripción */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Descripción</label>
              <textarea
                value={storeDescription}
                onChange={(e) => setStoreDescription(e.target.value)}
                className="border p-2 w-full rounded min-h-[100px] focus:ring-2 focus:ring-blue-500"
                placeholder="Describe tu tienda..."
                maxLength={1000}
                disabled={saving}
              />
              <p className="text-xs text-gray-500 mt-1">{storeDescription.length}/1000 caracteres</p>
            </div>

            {/* Contacto */}
            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium mb-1">Teléfono de contacto</label>
                <input
                  type="tel"
                  value={storeContactPhone}
                  onChange={(e) => setStoreContactPhone(e.target.value)}
                  className="border p-2 w-full rounded focus:ring-2 focus:ring-blue-500"
                  placeholder="0981234567"
                  disabled={saving}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email de contacto</label>
                <input
                  type="email"
                  value={storeContactEmail}
                  onChange={(e) => setStoreContactEmail(e.target.value)}
                  className="border p-2 w-full rounded focus:ring-2 focus:ring-blue-500"
                  placeholder="tienda@ejemplo.com"
                  disabled={saving}
                />
              </div>
            </div>

            {/* Ubicación de la tienda */}
            <div className="grid md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium mb-1">Departamento</label>
                <select
                  className="border p-2 w-full rounded focus:ring-2 focus:ring-blue-500"
                  value={storeDepartment}
                  onChange={(e) => {
                    setStoreDepartment(e.target.value);
                    setStoreCity('');
                  }}
                  disabled={saving}
                >
                  <option value="">— Selecciona —</option>
                  {PY_DEPARTMENTS.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Ciudad</label>
                <select
                  className="border p-2 w-full rounded focus:ring-2 focus:ring-blue-500"
                  value={storeCity}
                  onChange={(e) => setStoreCity(e.target.value)}
                  disabled={saving || !storeDepartment}
                >
                  <option value="">— Selecciona —</option>
                  {getCities(storeDepartment).map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Barrio</label>
                <input
                  type="text"
                  className="border p-2 w-full rounded focus:ring-2 focus:ring-blue-500"
                  placeholder="Barrio"
                  value={storeNeighborhood}
                  onChange={(e) => setStoreNeighborhood(e.target.value)}
                  disabled={saving}
                />
              </div>
            </div>

            {/* Dirección de la tienda */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Referencia / Dirección de la tienda</label>
              <input
                type="text"
                className="border p-2 w-full rounded focus:ring-2 focus:ring-blue-500"
                placeholder="Calle, número, referencia (opcional)"
                value={storeAddressNote}
                onChange={(e) => setStoreAddressNote(e.target.value)}
                disabled={saving}
              />
              <div className="flex items-center gap-3 mt-2">
                <button
                  type="button"
                  className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                    saving 
                      ? 'bg-gray-300 text-gray-600' 
                      : 'bg-gray-800 text-white hover:bg-black'
                  }`}
                  disabled={saving}
                  onClick={() => {
                    if (!navigator.geolocation) {
                      alert('Tu navegador no soporta geolocalización');
                      return;
                    }
                    navigator.geolocation.getCurrentPosition(
                      (pos) => {
                        setStoreLatitude(pos.coords.latitude);
                        setStoreLongitude(pos.coords.longitude);
                      },
                      () => alert('No se pudo obtener la ubicación'),
                      { enableHighAccuracy: true, timeout: 8000 }
                    );
                  }}
                >
                  📍 Usar ubicación de la tienda
                </button>
                {(storeLatitude && storeLongitude) ? (
                  <span className="text-xs text-gray-600">{storeLatitude.toFixed(5)}, {storeLongitude.toFixed(5)}</span>
                ) : (
                  <span className="text-xs text-gray-500">Opcional</span>
                )}
              </div>
            </div>

            {/* Rubros/Categorías */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                Rubros a los que se dedica la tienda
              </label>
              <p className="text-xs text-gray-600 mb-3">
                Selecciona las categorías que mejor describen los productos que vendes. Esto ayudará a los clientes a encontrarte.
              </p>
              <div className="border rounded-lg p-4 max-h-64 overflow-y-auto bg-gray-50">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {categories.map((cat) => (
                    <label
                      key={cat.id}
                      className="flex items-center gap-2 cursor-pointer hover:bg-white p-2 rounded"
                    >
                      <input
                        type="checkbox"
                        checked={selectedCategories.includes(cat.id)}
                        onChange={() => toggleCategory(cat.id)}
                        disabled={saving}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm">{cat.name}</span>
                    </label>
                  ))}
                </div>
                {categories.length === 0 && (
                  <p className="text-sm text-gray-500">No hay categorías disponibles</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Botones de acción */}
        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-3 rounded bg-black text-white hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {saving ? (savingStep || 'Guardando...') : 'Guardar cambios'}
          </button>
          <Link
            href="/dashboard"
            className="px-6 py-3 rounded bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors"
          >
            Cancelar
          </Link>
        </div>
      </form>
    </main>
  );
}
