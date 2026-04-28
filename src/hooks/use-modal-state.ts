import { useState, useCallback, useEffect } from 'react';

/**
 * Hook for managing modal state with proper cleanup
 * Prevents multiple stacked modals and ensures body scroll is restored
 */
export function useModalState(initialOpen = false) {
  const [isOpen, setIsOpen] = useState(initialOpen);

  const openModal = useCallback(() => {
    setIsOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsOpen(false);
    
    // Ensure body overflow is restored
    if (typeof document !== 'undefined') {
      document.body.style.overflow = '';
      document.body.style.pointerEvents = '';
    }
  }, []);

  const toggleModal = useCallback(() => {
    setIsOpen(prev => !prev);
  }, []);

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      if (typeof document !== 'undefined') {
        document.body.style.overflow = '';
        document.body.style.pointerEvents = '';
      }
    };
  }, []);

  return {
    isOpen,
    setIsOpen,
    openModal,
    closeModal,
    toggleModal,
  };
}