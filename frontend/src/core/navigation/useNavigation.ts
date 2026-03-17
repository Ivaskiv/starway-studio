import { NAVIGATION } from './navigation.registry'

export function findPageByPath(pathname: string) {
  for (const menu of NAVIGATION) {
    if (!menu.groups) continue
    for (const group of menu.groups) {
      for (const page of group.pages) {
        if (pathname === page.path || pathname.startsWith(page.path + '/')) {
          return page
        }
      }
    }
  }
  return null
}
