import { render, screen, waitFor } from '@testing-library/react'
import { AuthGuard } from '@/components/auth/AuthGuard'
import { useAuth } from '@/lib/auth-context'

const mockReplace = jest.fn()

jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace, push: jest.fn(), prefetch: jest.fn() }),
  usePathname: () => '/inventory',
}))

jest.mock('@/lib/auth-context', () => ({
  useAuth: jest.fn(),
}))

const mockedUseAuth = useAuth as jest.MockedFunction<typeof useAuth>

type AuthState = ReturnType<typeof useAuth>

function setAuth(overrides: Partial<AuthState>) {
  mockedUseAuth.mockReturnValue({
    user: null,
    isLoading: false,
    isAuthenticated: false,
    isDemoSession: false,
    login: jest.fn(),
    register: jest.fn(),
    logout: jest.fn(),
    refreshUser: jest.fn(),
    updateProfile: jest.fn(),
    changePassword: jest.fn(),
    ...overrides,
  })
}

describe('AuthGuard', () => {
  beforeEach(() => {
    mockReplace.mockClear()
    mockedUseAuth.mockReset()
  })

  it('redirects unauthenticated visitors to login with a next parameter', async () => {
    setAuth({ isAuthenticated: false, isLoading: false })

    render(
      <AuthGuard>
        <p>Protected content</p>
      </AuthGuard>,
    )

    expect(screen.queryByText('Protected content')).not.toBeInTheDocument()
    await waitFor(() =>
      expect(mockReplace).toHaveBeenCalledWith('/login?next=%2Finventory'),
    )
  })

  it('renders children for an authenticated session', () => {
    setAuth({ isAuthenticated: true, isLoading: false })

    render(
      <AuthGuard>
        <p>Protected content</p>
      </AuthGuard>,
    )

    expect(screen.getByText('Protected content')).toBeInTheDocument()
    expect(mockReplace).not.toHaveBeenCalled()
  })

  it('holds the shell skeleton while the session is restoring', () => {
    setAuth({ isAuthenticated: false, isLoading: true })

    render(
      <AuthGuard>
        <p>Protected content</p>
      </AuthGuard>,
    )

    expect(screen.queryByText('Protected content')).not.toBeInTheDocument()
    expect(mockReplace).not.toHaveBeenCalled()
  })
})
