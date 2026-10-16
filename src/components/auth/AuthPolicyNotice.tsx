interface AuthPolicyNoticeProps {
  action: '登录' | '注册'
}

const POLICY_URL = 'https://www.oasisintwrite.com/privacy'

export function AuthPolicyNotice({ action }: AuthPolicyNoticeProps) {
  return (
    <p className="text-center text-xs leading-6 text-gray-500">
      {action}即表示你已阅读并同意
      <a
        href={POLICY_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="mx-1 font-medium text-emerald-600 transition hover:text-emerald-500 hover:underline"
      >
        隐私与服务政策
      </a>
    </p>
  )
}
