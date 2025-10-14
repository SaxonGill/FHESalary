export class GenericStringStorage {
  async setItem(key: string, value: string) {
    localStorage.setItem(key, value);
  }
  async getItem(key: string): Promise<string | null> {
    return localStorage.getItem(key);
  }
}


