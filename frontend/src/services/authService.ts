export async function login(body: { email: string; password: string }) {
  // TODO: 백엔드 붙이면 여기 fetch로 바꾸면 됨
  if (!body.email.includes('@')) throw new Error('이메일 형식이 올바르지 않습니다.');
  if (body.password.length < 4) throw new Error('비밀번호가 너무 짧습니다.');
  return { accessToken: 'dummy_token' };
}

export async function signup(body: { email: string; password: string }) {
  if (!body.email.includes('@')) throw new Error('이메일 형식이 올바르지 않습니다.');
  if (body.password.length < 4) throw new Error('비밀번호는 4자 이상으로 해주세요.');
  return;
}
