# Design Document: Translation of Contract Interface and Project Payout Pages to Russian

## 1. Overview

This document outlines the approach for translating the Contract Interface and Project Payout pages of the FundChain application to Russian. The translation will leverage the existing internationalization (i18n) system already implemented in the application.

### 1.1 Purpose
To provide a fully localized Russian interface for the Contract Interface and Project Payout pages, ensuring that Russian-speaking users can effectively interact with smart contract functionality.

### 1.2 Scope
- Translation of all user-facing text in `contract-interface.html`
- Translation of all user-facing text in `project-payout.html`
- Update of Russian localization file (`ru.json`) with new translation strings
- Implementation of i18n functionality in the JavaScript files if needed

### 1.3 Current Status
The FundChain application already has a Russian localization file (`ru.json`) containing 768 lines of translations, but the Contract Interface and Project Payout pages have not yet been fully translated. The application already implements an i18n system with:
- HTML data attributes for translatable elements
- JSON files for language translations
- JavaScript i18n manager
- Language switcher functionality

## 2. Architecture

### 2.1 Current Localization System
The FundChain application already implements an internationalization system using:
- JSON files for language translations (`en.json`, `ru.json`)
- JavaScript i18n manager (`i18n.js`)
- HTML data attributes for translatable elements
- Language switcher functionality

### 2.2 Files to be Modified
1. `web/locales/ru.json` - Add new translation strings
2. `web/contract-interface.html` - Add data-i18n attributes to translatable elements
3. `web/project-payout.html` - Add data-i18n attributes to translatable elements
4. `web/contract-interface.js` - Implement i18n functionality if needed
5. `web/project-payout.js` - Implement i18n functionality if needed

## 3. Translation Requirements

### 3.1 Contract Interface Page (`contract-interface.html`)
The page contains the following sections that require translation:
- Page title: "FundChain — Contract Interface"
- Connection Settings section
- CommunityMultisig contract tab with sub-tabs:
  - Propose Transaction
  - Confirm Transaction
  - Execute Transaction
  - View Transactions
- Treasury contract tab
- Projects contract tab
- GovernanceSBT contract tab
- BallotCommitReveal contract tab
- Modal dialogs
- Navigation elements
- Form labels and placeholders
- Button texts
- Section titles
- Status messages

### 3.2 Project Payout Page (`project-payout.html`)
The page contains the following sections that require translation:
- Page title: "FundChain — Project Payout Interface"
- Web3 Connection section
- Payout workflow steps (5 steps)
- Step 1: Select Project
- Step 2: Propose Payout
- Step 3: Confirm Transaction
- Step 4: Execute Transaction
- Step 5: Complete Project
- Modal dialogs
- Navigation elements
- Form labels and placeholders
- Button texts
- Section titles
- Status messages
- Workflow step descriptions

## 4. Implementation Plan

### 4.1 Phase 1: Analysis and Preparation
1. Identify all translatable strings in both HTML files
2. Compare with existing translations in `ru.json`
3. Create a comprehensive list of new strings requiring translation
4. Map existing navigation translations to ensure consistency

### 4.2 Phase 2: Translation Updates
1. Add new translation strings to `ru.json` under new hierarchical keys
2. Update HTML files with data-i18n attributes for all translatable elements
3. Verify JavaScript files properly implement i18n functionality
4. Ensure consistency with existing Russian translations

### 4.3 Phase 3: Testing and Validation
1. Test Russian language interface
2. Verify all elements are properly translated
3. Check for any layout issues caused by text length differences
4. Validate that all functionality works identically in both languages

## 5. Data Models and Structures

### 5.1 Localization File Structure
The Russian localization file (`ru.json`) follows a hierarchical structure with the following main sections:
- `app`: Application-level translations
- `navigation`: Navigation menu items
- `controls`: UI controls
- `status`: Status indicators
- `buttons`: Button labels
- `messages`: System messages
- And various feature-specific sections

The existing file already contains translations for navigation items:
- `navigation.contract_interface`: "Интерфейс контрактов"
- `navigation.project_payout`: "Выплата проекта"

### 5.2 New Translation Keys
The following new keys will be added to support the Contract Interface and Project Payout pages:

Based on the analysis of the existing i18n system, new keys will be added to the existing hierarchical structure in `ru.json`. The i18n system uses dot notation to access nested translation keys, and the HTML elements use `data-i18n` attributes to specify which translation key to use.

The i18n system supports:
- Text content replacement for most HTML elements
- Placeholder text for input and textarea elements
- Alt text for image elements
- Text content for option elements
- Page title translation
- Parameter interpolation using `{{param}}` syntax
- Automatic language detection and storage in localStorage

The system already has established patterns for:
- Page titles in `app.title`
- Navigation items in `navigation.*`
- Button labels in `buttons.*`
- System messages in `messages.*`

#### Contract Interface Keys:
- `contract_interface`: {
  - `title`: "Интерфейс смарт-контрактов",
  - `page_title`: "FundChain — Интерфейс смарт-контрактов",
  - `connection_settings`: "Настройки подключения",
  - `rpc_url`: "URL RPC",
  - `chain_id`: "ID цепи",
  - `private_key`: "Приватный ключ",
  - `private_key_placeholder`: "Введите приватный ключ для подписания транзакций",
  - `private_key_help`: "Если не предоставлен, будет использован браузерный кошелек (MetaMask)",
  - `connect_web3`: "Подключиться к Web3",
  - `disconnect`: "Отключить",
  - `community_multisig`: "Мультиподпись сообщества",
  - `treasury`: "Казначейство",
  - `projects`: "Проекты",
  - `governance_sbt`: "Управление SBT",
  - `ballot_commit_reveal`: "Голосование Commit-Reveal",
  - `contract_address`: "Адрес контракта",
  - `transaction_management`: "Управление транзакциями",
  - `propose_transaction`: "Предложить транзакцию",
  - `confirm_transaction`: "Подтвердить транзакцию",
  - `execute_transaction`: "Выполнить транзакцию",
  - `view_transactions`: "Просмотр транзакций",
  - `propose_payout`: "Предложить выплату",
  - `recipient_address`: "Адрес получателя",
  - `recipient_address_placeholder`: "0x...",
  - `project_id`: "ID проекта",
  - `project_id_placeholder`: "0x...",
  - `amount_eth`: "Сумма (ETH)",
  - `description`: "Описание",
  - `description_placeholder`: "Опишите цель этой выплаты",
  - `propose_payout_button`: "Предложить выплату",
  - `transaction_id`: "ID транзакции",
  - `confirm_transaction_button`: "Подтвердить транзакцию",
  - `view_details`: "Просмотр деталей",
  - `view_tx_details`: "Просмотр деталей транзакции",
  - `execute_transaction_button`: "Выполнить транзакцию",
  - `recent_transactions`: "Последние транзакции",
  - `refresh_list`: "Обновить список",
  - `treasury_info`: "Информация о казначействе",
  - `get_treasury_info`: "Получить информацию о казначействе",
  - `project_allocation`: "Распределение по проекту",
  - `get_allocation_info`: "Получить информацию о распределении",
  - `project_status`: "Статус проекта",
  - `get_project_info`: "Получить информацию о проекте",
  - `update_project_status`: "Обновить статус проекта",
  - `new_status`: "Новый статус",
  - `status_reason`: "Причина изменения",
  - `status_reason_placeholder`: "Причина изменения статуса",
  - `update_status_button`: "Обновить статус",
  - `sbt_info`: "Информация о SBT",
  - `sbt_address`: "Адрес",
  - `sbt_address_placeholder`: "0x...",
  - `get_sbt_info`: "Получить информацию о SBT",
  - `voting_round`: "Раунд голосования",
  - `get_voting_info`: "Получить информацию о текущем раунде",
  - `status`: "Статус",
  - `status_disconnected`: "Отключен",
  - `status_connected`: "Подключен",
  - `account`: "Аккаунт",
  - `not_connected`: "Не подключен",
  - `info`: "Информация",
  - `info_connect_web3`: "Подключитесь к провайдеру Web3 для взаимодействия со смарт-контрактами."
  }

#### Project Payout Keys:
- `project_payout`: {
  - `title`: "Выплата по проекту и завершение",
  - `page_title`: "FundChain — Интерфейс выплат по проекту",
  - `web3_connection`: "Подключение Web3",
  - `multisig_address`: "Адрес мультиподписи",
  - `treasury_address`: "Адрес казначейства",
  - `projects_address`: "Адрес проектов",
  - `private_key`: "Приватный ключ (опционально)",
  - `private_key_placeholder`: "Введите приватный ключ для подписания транзакций",
  - `private_key_help`: "Если не предоставлен, будет использован браузерный кошелек (MetaMask)",
  - `connect_web3`: "Подключиться к Web3",
  - `disconnect`: "Отключить",
  - `workflow_steps`: {
    - `step_1`: "Выбор проекта",
    - `step_2`: "Предложение выплаты",
    - `step_3`: "Подтверждение",
    - `step_4`: "Выполнение",
    - `step_5`: "Завершение"
  },
  - `step_descriptions`: {
    - `step_1_desc`: "Выберите проект для выплаты",
    - `step_2_desc`: "Создать предложение мультиподписи",
    - `step_3_desc`: "Собрать необходимые подписи",
    - `step_4_desc`: "Выполнить транзакцию выплаты",
    - `step_5_desc`: "Завершить проект"
  },
  - `step_1_content`: {
    - `title`: "Выберите проект для выплаты",
    - `refresh_projects`: "Обновить проекты",
    - `next_step`: "Далее: Предложить выплату",
    - `loading_projects`: "Загрузка проектов...",
    - `info_step_1`: "Шаг 1: Выберите проект, который готов к выплате. Отображаются только проекты со статусом "Готов к выплате"."
  },
  - `step_2_content`: {
    - `title`: "Предложить выплату по проекту",
    - `selected_project`: "Выбранный проект",
    - `recipient_address`: "Адрес получателя",
    - `recipient_address_placeholder`: "0x...",
    - `amount_eth`: "Сумма (ETH)",
    - `max_available`: "Максимум доступно",
    - `payout_description`: "Описание",
    - `payout_description_placeholder`: "Опишите цель этой выплаты",
    - `back`: "Назад",
    - `propose_payout`: "Предложить выплату",
    - `info_step_2`: "Шаг 2: Создайте предложение мультиподписи для выплаты по проекту. Это еще не переведет средства, а только создаст предложение, требующее подписей."
  },
  - `step_3_content`: {
    - `title`: "Подтвердить транзакцию",
    - `transaction`: "Транзакция",
    - `refresh_status`: "Обновить статус транзакции",
    - `confirm_transaction`: "Подтвердить транзакцию",
    - `next_step`: "Далее: Выполнить транзакцию",
    - `info_step_3`: "Шаг 3: Транзакция должна быть подтверждена несколькими подписантами. Каждый авторизованный подписант должен подтвердить транзакцию.",
    - `tx_details`: "Детали транзакции"
  },
  - `step_4_content`: {
    - `title`: "Выполнить транзакцию",
    - `warning`: "Предупреждение",
    - `warning_text`: "Это переведет средства из казначейства указанному получателю.",
    - `refresh_status`: "Обновить статус транзакции",
    - `execute_transaction`: "Выполнить транзакцию",
    - `next_step`: "Далее: Завершить проект",
    - `info_step_4`: "Шаг 4: После получения необходимого количества подтверждений транзакция может быть выполнена.",
    - `execution_details`: "Детали выполнения"
  },
  - `step_5_content`: {
    - `title`: "Завершить проект",
    - `project`: "Проект",
    - `completion_notes`: "Заметки о завершении",
    - `completion_notes_placeholder`: "Добавьте заметки о завершении проекта",
    - `refresh_status`: "Обновить статус проекта",
    - `mark_paid`: "Пометить проект как оплаченный",
    - `back`: "Назад",
    - `finish`: "Завершить процесс",
    - `info_step_5`: "Шаг 5: Отметьте проект как завершенный, обновив его статус на "Оплачен".",
    - `completion_details`: "Детали завершения"
  },
  - `status`: "Статус",
  - `status_disconnected`: "Отключен",
  - `status_connected`: "Подключен",
  - `account`: "Аккаунт",
  - `not_connected`: "Не подключен",
  - `info`: "Информация",
  - `info_connect_web3`: "Подключитесь к провайдеру Web3 для взаимодействия со смарт-контрактами."
  }
}

## 6. Implementation Approach

### 6.1 HTML Updates
The HTML files will be updated to include `data-i18n` attributes for all translatable elements. The i18n system automatically processes these attributes when the page loads or when the language is changed.

For example:
```html
<!-- Before -->
<h2 class="card-title">Connection Settings</h2>

<!-- After -->
<h2 class="card-title" data-i18n="contract_interface.connection_settings">Connection Settings</h2>
```

### 6.2 JavaScript Integration
The existing JavaScript files (`contract-interface.js` and `project-payout.js`) will need to be updated to use the i18n system for dynamic content. The i18n manager is globally available as `window.i18n` and provides a `t()` method for translating keys.

For example:
```javascript
// Before
this.showError('Failed to connect to RPC endpoint');

// After
this.showError(window.i18n.t('messages.connection_error'));
```

### 6.3 Translation Key Organization
Translation keys will be organized hierarchically to match the structure of the pages:
- `contract_interface.*` for all Contract Interface page translations
- `project_payout.*` for all Project Payout page translations

This organization makes it easier to maintain and update translations.

## 7. Business Logic

### 7.1 Translation Workflow
The translation implementation follows these steps:
1. Extract all user-facing strings from HTML files
2. Add new translation keys to the Russian localization file
3. Update HTML elements with data-i18n attributes
4. Update JavaScript files to use i18n for dynamic content
5. Test the Russian interface

### 7.2 Dynamic Content Translation
Some content is dynamically generated by JavaScript and will need special handling:
- Status messages
- Error messages
- Form validation messages
- Modal content
- Workflow step descriptions
- Button labels in dynamically created elements

## 8. Testing Strategy

### 8.1 Functional Testing
1. Verify all static text is properly translated
2. Verify dynamic content is properly translated
3. Test language switching functionality
4. Check for layout issues with translated text

### 8.2 Usability Testing
1. Ensure all functionality remains accessible in Russian
2. Verify navigation is intuitive for Russian speakers
3. Check that all instructions are clear in Russian

### 8.3 Compatibility Testing
1. Test with different browsers
2. Verify mobile responsiveness with Russian text
3. Check that all functionality works identically in both languages

### 8.4 Regression Testing
1. Verify that existing translations in other parts of the application still work correctly
2. Check that switching between Contract Interface and Project Payout pages maintains the correct language
3. Ensure that the language preference is properly saved and restored

## 9. Conclusion

The translation of the Contract Interface and Project Payout pages to Russian will enhance the accessibility of the FundChain application for Russian-speaking users. By leveraging the existing i18n infrastructure, this implementation will provide a consistent and localized experience while maintaining all existing functionality.

The hierarchical organization of translation keys will make future maintenance easier, and the comprehensive testing approach will ensure a high-quality user experience. This work will contribute to the overall goal of making FundChain a truly international platform that can be used by communities around the world.