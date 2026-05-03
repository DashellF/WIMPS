import { highlightMipsCode } from '@/helpers/mipsSyntax';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Image, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Editor from 'react-simple-code-editor';
import type { Theme } from '../theme/themes';

const TAB = '    ';

const getFallbackSyntax = (text: string) => ({
  instruction: text,
  register: text,
  directive: text,
  comment: text,
  number: text,
  label: text,
  string: text,
  text,
});

export function CodeEditor({ code, setCode, actions, theme }: any) {
  
  const [showActionMenu, setShowActionMenu] = useState(false);
  const menuAnim = useRef(new Animated.Value(0)).current;
  const styles = getThemeStyles(theme);

  const lines = code.split('\n');
  const lineCount = lines.length;

  useEffect(() => {
    Animated.timing(menuAnim, {
      toValue: showActionMenu ? 1 : 0,
      duration: 180,
      useNativeDriver: true,
    }).start();
  }, [showActionMenu]);

  const handleKeyPress = (e: any) => {
  if (Platform.OS !== 'web') return;

  const target = e.currentTarget as HTMLTextAreaElement;
  const start = target.selectionStart;
  const end = target.selectionEnd;

  if (e.key === 'Tab') {
    e.preventDefault();

    const newText = code.slice(0, start) + TAB + code.slice(end);
    setCode(newText);

    requestAnimationFrame(() => {
      target.selectionStart = start + TAB.length;
      target.selectionEnd = start + TAB.length;
    });
  }
};
  



  return (
  <View style={styles.wrapper}>
    <View style={styles.floatingMenuArea}>
      <TouchableOpacity
  style={styles.menuToggleButton}
  onPress={() => setShowActionMenu((prev) => !prev)}
  activeOpacity={0.85}
>
  <Image
    source={require('../../assets/images/chevron_down.png')}
    style={[
      styles.chevronImage,
      {
        tintColor: theme.text,
        transform: [{ rotate: showActionMenu ? '180deg' : '0deg' }],
      },
    ]}
  />
</TouchableOpacity>

{showActionMenu && (
  <Animated.View
    style={[
      styles.floatingActionsRow,
      {
        opacity: menuAnim,
        transform: [
          {
            translateY: menuAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [-6, 0],
            }),
          },
        ],
      },
    ]}
  >
    {actions.map((a: any) => (
      <TouchableOpacity
        key={a.label}
        style={styles.floatingActionButton}
        onPress={a.onPress}
      >
        {a.icon ? (
          <Image
            source={a.icon}
            style={[
              styles.actionIcon,
              { tintColor: theme.text },
            ]}
          />
        ) : (
          <Text style={styles.actionButtonText}>{a.label}</Text>
        )}
      </TouchableOpacity>
    ))}
  </Animated.View>
)}
    </View>

    <View style={styles.editorShell}>
  <ScrollView
    contentContainerStyle={styles.scrollContent}
    bounces={false}
    showsVerticalScrollIndicator={true}
  >
    <View style={styles.gutter}>
      {Array.from({ length: lineCount }).map((_, i) => (
        <Text key={i} style={styles.lineNumber}>
          {i + 1}
        </Text>
      ))}
    </View>

    <View style={styles.editorInputWrapper}>
      

      <Editor
  value={code}
  onValueChange={setCode}
  highlight={(value) =>
    highlightMipsCode(value, theme.syntax ?? getFallbackSyntax(theme.text))
  }
  padding={16}
  onKeyDown={handleKeyPress}

  textareaClassName="mips-editor-textarea"
  preClassName="mips-editor-highlight"

  style={{
    flex: 1,
    minHeight: '100%',
    fontFamily: 'monospace',
    fontSize: 15,
    lineHeight: '22px',

    color: 'transparent',        // 👈 keep this
    caretColor: theme.text,      // 👈 keep this

    backgroundColor: 'transparent',
    outline: 'none',
  }}
/>
    </View>
  </ScrollView>
</View>
  </View>
);
}

const getThemeStyles = (theme: Theme) => StyleSheet.create({
  
  wrapper: { flex: 1, backgroundColor: theme.bg, padding: 14, borderWidth: 1, borderColor: theme.border },

  actionIcon: {
    width: 20,
    height: 20,
    resizeMode: 'contain',
  },
  actionButtonText: { 
    color: theme.text, 
    fontWeight: '600',
    fontSize: 11 
  },
  editorShell: { 
    flex: 1, 
    backgroundColor: theme.card, 
    borderRadius: 12, 
    overflow: 'visible', 
    borderWidth: 1, 
    borderColor: theme.border,
  },
  scrollContent: {
    flexDirection: 'row',
    minHeight: '100%',
  },
  gutter: {
    width: 45,
    backgroundColor: theme.bg,
    paddingTop: 16,
    borderRightWidth: 1,
    borderRightColor: theme.border,
    // Ensure gutter height matches the input height
    paddingBottom: 100, 
  },
  lineNumber: {
    color: theme.subText,
    fontSize: 12,
    fontFamily: 'monospace',
    lineHeight: 22, // Sync with Input
    textAlign: 'right',
    paddingRight: 10,
  },
  
   floatingMenuArea: {
    position: 'absolute',
    top: 10,
    right: 25,
    zIndex: 20,
    elevation: 10,
    alignItems: 'flex-end',
    marginTop: 10,
    marginRight: 10
},

  floatingActionsRow: {
    flexDirection: 'column',
    gap: 8,
    marginTop: 8,
  },

  floatingActionButton: {
    backgroundColor: theme.bg,
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.border
  },

menuToggleButton: {
  backgroundColor: theme.bg,
  width: 44,
  height: 44,
  justifyContent: 'center',
  alignItems: 'center',
  borderRadius: 10,
  borderWidth: 1,
  borderColor: theme.border
},
chevronImage: {
  width: 28,
  height: 28,
  resizeMode: 'contain',
},
editorInputWrapper: {
  flex: 1,
  position: 'relative',
  minHeight: '100%',
},

});