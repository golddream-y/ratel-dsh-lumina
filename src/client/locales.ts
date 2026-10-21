/**
 * Locale dictionaries.
 *
 * The namespace is registered with the locale service and named on the slot
 * registration, so the settings page's label and its copy follow the active
 * locale without the shell subscribing to locale state.
 */

/** The locale namespace of the Lumina settings page. */
export const LUMINA_LOCALE_NAMESPACE = 'settings.lumina'

/** The English dictionary. */
export const en = {
  nav: 'Lumina',
  heading: 'Lumina · motion',
  intro: 'Motion enhancements for this client. Every effect can be switched off on its own, and turning the master switch off restores the original appearance entirely.',
  master: 'Enable motion effects',
  masterHint: 'The master switch. Off means the client looks exactly as it does without Lumina.',
  brand: 'Brand preset',
  brandHint: 'The brand mark in the sidebar and the accent color of every effect.',
  brandRatel: 'Ratel',
  brandDeepseek: 'DeepSeek',
  intensity: 'Motion intensity',
  intensityHint: 'Scales every duration. Subtle is slower and softer, vivid is faster and stronger.',
  intensitySubtle: 'Subtle',
  intensityNormal: 'Normal',
  intensityVivid: 'Vivid',
  effects: 'Effects',
  effectBrand: 'Brand mark',
  effectBrandHint: 'The sidebar mark and wordmark.',
  effectComposerGlow: 'Composer edge glow',
  effectComposerGlowHint: 'A light travelling around the input box border.',
  effectCaret: 'Streaming caret',
  effectCaretHint: 'The text cursor breathes while the model is writing.',
  effectPress: 'Button press and send flash',
  effectPressHint: 'Buttons give a small press response; sending flashes once.',
  effectHero: 'New session entrance',
  effectHeroHint: 'The empty-state icon fades in when a new conversation starts.',
  effectSessionActivity: 'Session activity indicator',
  effectSessionActivityHint: 'The running-session spinner breathes in the brand color.',
  preview: 'Preview',
  previewHint: 'A miniature of the composer and the brand mark.',
  restoreDefaults: 'Restore defaults',
  cancel: 'Cancel',
  save: 'Save',
  saved: 'Saved',
  storageError: 'The settings could not be saved.',
  updated: 'Updated',
} as const

/** The Simplified Chinese dictionary. */
export const zh = {
  nav: '流光',
  heading: '流光 · 动效',
  intro: '为客户端添加视觉动效。每个效果都能单独关闭；关掉总开关后，界面完全回到官方样子。',
  master: '启用动效',
  masterHint: '总开关。关闭后客户端与未安装流光时完全一致。',
  brand: '品牌预设',
  brandHint: '侧栏品牌图形，以及所有效果使用的主色。',
  brandRatel: 'Ratel',
  brandDeepseek: 'DeepSeek',
  intensity: '动效强度',
  intensityHint: '统一缩放所有时长。柔和更慢更轻，鲜明更快更强。',
  intensitySubtle: '柔和',
  intensityNormal: '标准',
  intensityVivid: '鲜明',
  effects: '效果',
  effectBrand: '品牌标识',
  effectBrandHint: '侧栏图标与字标。',
  effectComposerGlow: '输入框边缘流光',
  effectComposerGlowHint: '一圈光沿输入框边框缓慢流动。',
  effectCaret: '打字机光标',
  effectCaretHint: '模型输出时光标柔和呼吸，不再生硬闪烁。',
  effectPress: '按钮按压与发送闪光',
  effectPressHint: '按钮按下有缩放反馈，发送后闪光一次。',
  effectHero: '新会话首屏入场',
  effectHeroHint: '新建会话时首屏图标淡入。',
  effectSessionActivity: '会话进行中指示',
  effectSessionActivityHint: '运行中的会话转圈会呼吸并染成品牌色。',
  preview: '预览',
  previewHint: '输入框与品牌标识的缩略演示。',
  restoreDefaults: '恢复默认',
  cancel: '取消',
  save: '保存',
  saved: '已保存',
  storageError: '设置未能保存。',
  updated: '已更新',
} as const
