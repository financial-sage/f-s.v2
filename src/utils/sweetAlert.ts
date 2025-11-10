import Swal from 'sweetalert2';

// Configuración de tema oscuro personalizado para SweetAlert2
const darkTheme = {
  background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
  color: '#e4e4e7',
  confirmButtonColor: '#3b82f6',
  cancelButtonColor: '#71717a',
  iconColor: '#3b82f6',
};

// Alerta de éxito
export const showSuccess = (message: string, title: string = '¡Éxito!') => {
  return Swal.fire({
    title,
    text: message,
    icon: 'success',
    background: darkTheme.background,
    color: darkTheme.color,
    confirmButtonColor: '#22c55e',
    confirmButtonText: 'Aceptar',
    customClass: {
      popup: 'border border-zinc-700 shadow-2xl',
      confirmButton: 'px-4 py-2 rounded-lg font-medium',
    },
  });
};

// Alerta de error
export const showError = (message: string, title: string = 'Error') => {
  return Swal.fire({
    title,
    text: message,
    icon: 'error',
    background: darkTheme.background,
    color: darkTheme.color,
    confirmButtonColor: '#ef4444',
    confirmButtonText: 'Aceptar',
    customClass: {
      popup: 'border border-zinc-700 shadow-2xl',
      confirmButton: 'px-4 py-2 rounded-lg font-medium',
    },
  });
};

// Alerta de advertencia
export const showWarning = (message: string, title: string = 'Advertencia') => {
  return Swal.fire({
    title,
    text: message,
    icon: 'warning',
    background: darkTheme.background,
    color: darkTheme.color,
    confirmButtonColor: '#f59e0b',
    confirmButtonText: 'Aceptar',
    customClass: {
      popup: 'border border-zinc-700 shadow-2xl',
      confirmButton: 'px-4 py-2 rounded-lg font-medium',
    },
  });
};

// Alerta de información
export const showInfo = (message: string, title: string = 'Información') => {
  return Swal.fire({
    title,
    text: message,
    icon: 'info',
    background: darkTheme.background,
    color: darkTheme.color,
    confirmButtonColor: darkTheme.confirmButtonColor,
    confirmButtonText: 'Aceptar',
    customClass: {
      popup: 'border border-zinc-700 shadow-2xl',
      confirmButton: 'px-4 py-2 rounded-lg font-medium',
    },
  });
};

// Confirmación
export const showConfirm = async (
  message: string,
  title: string = '¿Estás seguro?',
  confirmText: string = 'Sí, continuar',
  cancelText: string = 'Cancelar'
) => {
  const result = await Swal.fire({
    title,
    text: message,
    icon: 'question',
    showCancelButton: true,
    background: darkTheme.background,
    color: darkTheme.color,
    confirmButtonColor: darkTheme.confirmButtonColor,
    cancelButtonColor: darkTheme.cancelButtonColor,
    confirmButtonText: confirmText,
    cancelButtonText: cancelText,
    customClass: {
      popup: 'border border-zinc-700 shadow-2xl',
      confirmButton: 'px-4 py-2 rounded-lg font-medium',
      cancelButton: 'px-4 py-2 rounded-lg font-medium',
    },
  });

  return result.isConfirmed;
};

// Confirmación de eliminación
export const showDeleteConfirm = async (
  itemName: string = 'este elemento'
) => {
  const result = await Swal.fire({
    title: '¿Eliminar?',
    text: `¿Estás seguro de que deseas eliminar ${itemName}? Esta acción no se puede deshacer.`,
    icon: 'warning',
    showCancelButton: true,
    background: darkTheme.background,
    color: darkTheme.color,
    confirmButtonColor: '#ef4444',
    cancelButtonColor: darkTheme.cancelButtonColor,
    confirmButtonText: 'Sí, eliminar',
    cancelButtonText: 'Cancelar',
    customClass: {
      popup: 'border border-zinc-700 shadow-2xl',
      confirmButton: 'px-4 py-2 rounded-lg font-medium',
      cancelButton: 'px-4 py-2 rounded-lg font-medium',
    },
  });

  return result.isConfirmed;
};

// Toast notification (esquina superior derecha)
export const showToast = (message: string, icon: 'success' | 'error' | 'warning' | 'info' = 'success') => {
  const Toast = Swal.mixin({
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
    background: darkTheme.background,
    color: darkTheme.color,
    customClass: {
      popup: 'border border-zinc-700 shadow-2xl',
    },
    didOpen: (toast) => {
      toast.addEventListener('mouseenter', Swal.stopTimer);
      toast.addEventListener('mouseleave', Swal.resumeTimer);
    }
  });

  return Toast.fire({
    icon,
    title: message
  });
};
