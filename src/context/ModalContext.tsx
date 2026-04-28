'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type ModalType = 'swap' | 'winner' | 'zero-confirm' | 'score-edit' | null;

interface ModalState {
  type: ModalType;
  data?: any;
}

interface ModalContextType {
  currentModal: ModalState;
  openModal: (type: ModalType, data?: any) => void;
  closeModal: () => void;
  updateModalData: (data: any) => void;
  isModalOpen: boolean;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export function ModalProvider({ children }: { children: ReactNode }) {
  const [currentModal, setCurrentModal] = useState<ModalState>({ type: null });

  const openModal = (type: ModalType, data?: any) => {
    // Prevent multiple modals by closing any existing one first
    if (currentModal.type) {
      closeModal();
      // Small delay to ensure cleanup
      setTimeout(() => setCurrentModal({ type, data }), 10);
    } else {
      setCurrentModal({ type, data });
    }
  };

  const closeModal = () => {
    setCurrentModal({ type: null });
  };

  const updateModalData = (newData: any) => {
    setCurrentModal(prev => ({ ...prev, data: { ...prev.data, ...newData } }));
  };

  // Handle body scroll and pointer events
  useEffect(() => {
    const isOpen = currentModal.type !== null;

    if (isOpen) {
      // Prevent body scroll
      document.body.style.overflow = 'hidden';
      // Ensure pointer events are enabled (in case they were disabled)
      document.body.style.pointerEvents = 'auto';
    } else {
      // Restore body scroll
      document.body.style.overflow = '';
      document.body.style.pointerEvents = '';
    }

    // Cleanup on unmount
    return () => {
      document.body.style.overflow = '';
      document.body.style.pointerEvents = '';
    };
  }, [currentModal.type]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && currentModal.type) {
        closeModal();
      }
    };

    if (currentModal.type) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [currentModal.type]);

  const value: ModalContextType = {
    currentModal,
    openModal,
    closeModal,
    updateModalData,
    isModalOpen: currentModal.type !== null,
  };

  return (
    <ModalContext.Provider value={value}>
      {children}
    </ModalContext.Provider>
  );
}

export function useModal() {
  const context = useContext(ModalContext);
  if (context === undefined) {
    throw new Error('useModal must be used within a ModalProvider');
  }
  return context;
}