import React from 'react';
import { TrendingUp } from 'lucide-react';

interface CategorySelectorProps {
  categories: any[];
  selectedCategory: string;
  onCategorySelect: (categoryId: string) => void;
  threads: any[];
}

export default function CategorySelector({ 
  categories, 
  selectedCategory, 
  onCategorySelect, 
  threads 
}: CategorySelectorProps) {
  const getCategoryThreadCount = (categoryId: string) => {
    return threads.filter(thread => thread.category_id === categoryId).length;
  };

  const getTotalThreads = () => {
    return threads.length;
  };

  const getMostActiveCategory = () => {
    if (categories.length === 0) return null;
    
    return categories.reduce((mostActive, category) => {
      const currentCount = getCategoryThreadCount(category.id);
      const mostActiveCount = getCategoryThreadCount(mostActive.id);
      return currentCount > mostActiveCount ? category : mostActive;
    });
  };

  const mostActiveCategory = getMostActiveCategory();

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Browse Categories</h2>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          {getTotalThreads()} total threads
        </div>
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {categories.map((category) => {
          const threadCount = getCategoryThreadCount(category.id);
          const isSelected = selectedCategory === category.id;
          const isMostActive = mostActiveCategory?.id === category.id;

          return (
            <button
              key={category.id}
              onClick={() => onCategorySelect(isSelected ? '' : category.id)}
              className={`p-4 rounded-xl border-2 transition-all duration-200 group relative ${
                isSelected
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-lg scale-105'
                  : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-md'
              }`}
            >
              {isMostActive && (
                <div className="absolute -top-2 -right-2 bg-orange-500 text-white text-xs px-2 py-1 rounded-full flex items-center space-x-1">
                  <TrendingUp className="w-3 h-3" />
                  <span>Hot</span>
                </div>
              )}
              
              <div className="flex items-center space-x-3 mb-2">
                <div 
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-semibold"
                  style={{ backgroundColor: category.color }}
                >
                  {category.name.charAt(0).toUpperCase()}
                </div>
                <div className="text-left flex-1">
                  <div className="font-semibold text-gray-900 dark:text-white">{category.name}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">{threadCount} threads</div>
                </div>
              </div>
              
              {category.description && (
                <p className="text-xs text-gray-600 dark:text-gray-400 text-left line-clamp-2">
                  {category.description}
                </p>
              )}
              
              {threadCount > 0 && (
                <div className="mt-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1">
                  <div
                    className="h-1 rounded-full transition-all duration-300"
                    style={{ 
                      backgroundColor: category.color,
                      width: `${Math.min(100, (threadCount / Math.max(...categories.map(c => getCategoryThreadCount(c.id)))) * 100)}%`
                    }}
                  ></div>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}