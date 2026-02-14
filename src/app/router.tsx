import { createBrowserRouter, Navigate } from 'react-router-dom'
import { CheerPage } from '../features/cheer'

/**
 * アプリケーションのルーター設定
 */
export const router = createBrowserRouter([
  {
    path: '/cheer/:shareToken',
    element: <CheerPage />,
  },
  {
    // ルート以外は /cheer へリダイレクト（または 404 ページ）
    path: '*',
    element: <Navigate to="/cheer/demo" replace />,
  },
])
