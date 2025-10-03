"use client";

import UMLDiagramApp from '../components/UMLDiagramApp';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { UserHeader } from '../components/UserHeader';

export default function HomePage() {
  return (
    <ProtectedRoute>
      <div className="h-screen w-screen flex flex-col">
        <UserHeader />
        <div className="flex-1">
          <UMLDiagramApp />
        </div>
      </div>
    </ProtectedRoute>
  );
}
