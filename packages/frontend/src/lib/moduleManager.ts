// src/lib/moduleManager.ts
import { Module, ModuleId, AVAILABLE_MODULES } from '@starway/shared/src/types/api'


class ModuleManager {
  private modules: Map<ModuleId, Module> = new Map()
  
  constructor() {
    this.initializeModules()
  }
  
  private initializeModules() {
    AVAILABLE_MODULES.forEach(module => {
      this.modules.set(module.id, module)
    })
  }
  
  // Отримати модуль
  getModule(id: ModuleId): Module | undefined {
    return this.modules.get(id)
  }
  
  // Отримати всі модулі
  getAllModules(): Module[] {
    return Array.from(this.modules.values())
  }
  
  // Отримати активні модулі
  getEnabledModules(): Module[] {
    return this.getAllModules().filter(m => m.enabled)
  }
  
  // Отримати модулі за категорією
  getModulesByCategory(category: string): Module[] {
    return this.getAllModules().filter(m => m.category === category)
  }
  
  // Перевірити чи модуль активний
  isModuleEnabled(id: ModuleId): boolean {
    const module = this.getModule(id)
    return module?.enabled || false
  }
  
  // Увімкнути модуль
  enableModule(id: ModuleId): boolean {
    const module = this.getModule(id)
    if (!module) return false
    
    // Перевірити залежності
    if (module.dependencies) {
      const allDepsEnabled = module.dependencies.every(depId => 
        this.isModuleEnabled(depId)
      )
      
      if (!allDepsEnabled) {
        console.warn(`Cannot enable ${id}: missing dependencies`)
        return false
      }
    }
    
    module.enabled = true
    return true
  }
  
  // Вимкнути модуль
  disableModule(id: ModuleId): boolean {
    const module = this.getModule(id)
    if (!module) return false
    
    // Перевірити чи інші модулі залежать від цього
    const dependentModules = this.getAllModules().filter(m => 
      m.dependencies?.includes(id) && m.enabled
    )
    
    if (dependentModules.length > 0) {
      console.warn(`Cannot disable ${id}: other modules depend on it`)
      return false
    }
    
    module.enabled = false
    return true
  }
  
  // Оновити налаштування модуля
  updateModuleSettings(id: ModuleId, settings: any): boolean {
    const module = this.getModule(id)
    if (!module) return false
    
    module.settings = { ...module.settings, ...settings }
    return true
  }
  
  // Перевірити чи користувач має доступ до модуля
  hasAccess(id: ModuleId, userPlan: 'free' | 'premium'): boolean {
    const module = this.getModule(id)
    if (!module) return false
    
    if (module.isPremium && userPlan === 'free') {
      return false
    }
    
    return module.enabled
  }
}

export const moduleManager = new ModuleManager()
