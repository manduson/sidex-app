import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Login = () => {
  const [nickname, setNickname] = useState('');
  const navigate = useNavigate();

  const handleStart = () => {
    if (nickname.trim().length === 0) {
      alert('닉네임을 입력해주세요!');
      return;
    }
    // 로컬 스토리지에 닉네임 저장
    localStorage.setItem('sidex_nickname', nickname.trim());
    navigate('/'); // 메인 피드 화면으로 이동
  };

  return (
    <div className="login-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '20px' }}>
      <div style={{ textAlign: 'center', marginBottom: '30px' }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '10px' }}>👋 환영합니다!</h2>
        <p style={{ color: 'var(--text-muted)' }}>시덱스 추천템 리스트를 공유하기 위해<br/>원장님의 닉네임(또는 병원명)을 설정해주세요.</p>
      </div>

      <div className="input-group" style={{ width: '100%', marginBottom: '20px' }}>
        <input 
          type="text" 
          className="text-input" 
          placeholder="예: 강남유치과, 김원장" 
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleStart()}
        />
      </div>

      <button className="btn btn-primary" onClick={handleStart}>
        입장하기
      </button>
    </div>
  );
};

export default Login;
