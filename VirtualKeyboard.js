import React from 'react';

const VirtualKeyboard = ({ type = 'text', onInput, onDelete, onSubmit }) => {
  // Layout for Parent Mode / PIN entry
  const numericLayout = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['Backspace', '0', 'Enter']
  ];

  // Layout for standard text entry
  const textLayout = [
    ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
    ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
    ['z', 'x', 'c', 'v', 'b', 'n', 'm'],
    ['Space', 'Backspace', 'Enter']
  ];

  const layout = type === 'numeric' ? numericLayout : textLayout;

  const handleKeyPress = (key) => {
    if (key === 'Backspace') {
      if (onDelete) onDelete();
    } else if (key === 'Enter') {
      if (onSubmit) onSubmit();
    } else if (key === 'Space') {
      if (onInput) onInput(' ');
    } else {
      if (onInput) onInput(key);
    }
  };

  // Basic inline styles for the keyboard
  const styles = {
    container: {
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      padding: '15px',
      backgroundColor: '#f5f5f5',
      borderRadius: '12px',
      maxWidth: type === 'numeric' ? '240px' : '100%',
      margin: '10px auto',
      boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
    },
    row: {
      display: 'flex',
      justifyContent: 'center',
      gap: '6px'
    },
    button: {
      padding: '12px',
      minWidth: '40px',
      fontSize: '18px',
      fontWeight: 'bold',
      cursor: 'pointer',
      borderRadius: '6px',
      border: '1px solid #ddd',
      backgroundColor: 'white',
      flex: 1,
      touchAction: 'manipulation' // Improves touch response on mobile
    },
    actionButton: {
      backgroundColor: '#e3f2fd',
      color: '#1976d2'
    }
  };

  return (
    <div style={styles.container}>
      {layout.map((row, rowIndex) => (
        <div key={rowIndex} style={styles.row}>
          {row.map((key) => {
            const isAction = ['Enter', 'Backspace', 'Space'].includes(key);
            return (
              <button
                key={key}
                onClick={() => handleKeyPress(key)}
                style={{ ...styles.button, ...(isAction ? styles.actionButton : {}) }}
              >
                {key === 'Backspace' ? '⌫' : key === 'Enter' ? '↵' : key}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
};

export default VirtualKeyboard;