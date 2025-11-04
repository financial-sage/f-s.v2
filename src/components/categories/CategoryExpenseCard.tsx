import React, { useState } from 'react';
import { CategoryWithSubcategories } from '@/src/lib/supabase/subcategories';
import { CategoryIcon } from '@/src/components/categories/CategoryIcons';
import { useCurrency } from '@/src/contexts/CurrencyContext';
import styles from '@/scss/modules/expensesTracking.module.scss';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface CategoryExpenseCardProps {
  category: CategoryWithSubcategories;
}

export function CategoryExpenseCard({ category }: CategoryExpenseCardProps) {
  const { formatAmount } = useCurrency();
  const [isExpanded, setIsExpanded] = useState(false);

  const budgetLimit = category.budget_limit || 0;
  const totalExpenses = category.total_expenses || 0;
  const progressPercentage = budgetLimit > 0 ? Math.min(100, (totalExpenses / budgetLimit) * 100) : 0;
  const hasSubcategories = category.subcategories && category.subcategories.length > 0;

  // Determinar color de progreso
  const getProgressColor = () => {
    if (progressPercentage >= 100) return styles.progressDanger;
    if (progressPercentage >= 80) return styles.progressWarning;
    return styles.progressNormal;
  };

  return (
    <div className={styles.categoryCard}>
      <div 
        className={styles.categoryHeader}
        onClick={() => hasSubcategories && setIsExpanded(!isExpanded)}
        style={{ cursor: hasSubcategories ? 'pointer' : 'default' }}
      >
        <div className={styles.categoryInfo}>
          <div 
            className={styles.categoryIcon}
            style={{ backgroundColor: category.color }}
          >
            <CategoryIcon 
              iconName={category.icon || 'folder'} 
              size={20}
              color="white"
            />
          </div>
          <div className={styles.categoryDetails}>
            <h3 className={styles.categoryName}>{category.name}</h3>
            {budgetLimit > 0 && (
              <span className={styles.budgetInfo}>
                Presupuesto: {formatAmount(budgetLimit)}
              </span>
            )}
          </div>
        </div>

        <div className={styles.categoryAmount}>
          <div className={styles.amountDisplay}>
            <span className={styles.spent}>{formatAmount(totalExpenses)}</span>
            {budgetLimit > 0 && (
              <span className={styles.remaining}>
                Resta: {formatAmount(Math.max(0, budgetLimit - totalExpenses))}
              </span>
            )}
          </div>
          {hasSubcategories && (
            <button className={styles.expandButton}>
              {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>
          )}
        </div>
      </div>

      {/* Barra de progreso */}
      {budgetLimit > 0 && (
        <div className={styles.progressContainer}>
          <div className={styles.progressBar}>
            <div 
              className={`${styles.progressFill} ${getProgressColor()}`}
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
          <span className={styles.progressText}>
            {progressPercentage.toFixed(0)}%
          </span>
        </div>
      )}

      {/* Subcategorías expandibles */}
      {hasSubcategories && isExpanded && (
        <div className={styles.subcategoriesContainer}>
          {category.subcategories.map((subcategory) => (
            <div key={subcategory.id} className={styles.subcategoryItem}>
              <div className={styles.subcategoryName}>
                <span className={styles.subcategoryBullet}>•</span>
                {subcategory.name}
              </div>
              <div className={styles.subcategoryAmount}>
                {formatAmount(subcategory.total_expenses)}
              </div>
            </div>
          ))}
          {category.subcategories.length === 0 && (
            <div className={styles.noSubcategories}>
              No hay subcategorías con gastos
            </div>
          )}
        </div>
      )}
    </div>
  );
}
