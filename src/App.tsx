import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Login from './pages/Login';
import Feed from './pages/Feed';
import AddItem from './pages/AddItem';
import { isConfigured } from './lib/supabase';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5분 캐싱
      refetchOnWindowFocus: false, // 창 포커스 시 재요청 끄기 (Egress 최소화)
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <div className="app-container">
        <div className="header">
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            ✨ 원장님 추천템 모음집 
            <span style={{ 
              fontSize: '0.85rem', 
              fontWeight: 600, 
              color: '#64748B', 
              WebkitTextFillColor: 'initial',
              background: '#F1F5F9', 
              padding: '2px 8px', 
              borderRadius: '12px',
              border: '1px solid var(--border)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '2px',
              marginLeft: '4px'
            }}>
              🥟만두
            </span>
          </h1>
        </div>
        <div className="content">
          {!isConfigured ? (
            <div style={{ padding: '20px', textAlign: 'center', background: '#FEF2F2', borderRadius: '12px', border: '1px solid #FCA5A5' }}>
              <h2 style={{ color: '#DC2626', marginBottom: '10px' }}>⚠️ Supabase 설정 필요</h2>
              <p style={{ color: '#991B1B', fontSize: '0.9rem' }}>
                <code>.env</code> 파일에 올바른 <strong>VITE_SUPABASE_URL</strong>과 <strong>VITE_SUPABASE_ANON_KEY</strong>를 입력한 후 서버를 재시작해주세요.
              </p>
            </div>
          ) : (
            <Routes>
              <Route path="/" element={<Feed />} />
              <Route path="/login" element={<Login />} />
              <Route path="/add" element={<AddItem />} />
            </Routes>
          )}
        </div>
      </div>
    </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
