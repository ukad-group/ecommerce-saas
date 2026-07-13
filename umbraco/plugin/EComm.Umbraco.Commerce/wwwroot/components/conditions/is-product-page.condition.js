import { UmbConditionBase } from '@umbraco-cms/backoffice/extension-registry';
import { UMB_AUTH_CONTEXT } from '@umbraco-cms/backoffice/auth';
import { UMB_DOCUMENT_WORKSPACE_CONTEXT } from '@umbraco-cms/backoffice/document';

// Module-level cache: the condition instance lives as long as the manifest is
// loaded (it isn't recreated per node navigation), but fetch once regardless
// so a slow settings load can't cause repeat requests per click.
let productPageAliasesPromise = null;

function fetchProductPageAliases(authContext) {
  if (!productPageAliasesPromise) {
    productPageAliasesPromise = (async () => {
      try {
        const token = await authContext?.getLatestToken();
        const response = await fetch('/umbraco/management/api/ecomm-commerce/settings/defaults', {
          headers: { 'Authorization': `Bearer ${token}` },
          credentials: 'include'
        });
        if (response.ok) {
          const data = await response.json();
          if (Array.isArray(data.productPageAliases) && data.productPageAliases.length > 0) {
            return data.productPageAliases;
          }
        }
      } catch (err) {
        console.error('EComm.Condition.IsProductPage: failed to load product page aliases', err);
      }
      return ['productPage'];
    })();
  }
  return productPageAliasesPromise;
}

// Gates the "eCommerce" workspace tab to nodes whose content type alias is in the
// site's configured Product Page Aliases list (Settings > Commerce Settings > Defaults).
// Umbraco's built-in Umb.Condition.WorkspaceContentTypeAlias can't be used here because
// its allowed-aliases list is static JSON baked into the manifest, while ours is only
// known at runtime (fetched from our own settings API).
export class EcommIsProductPageCondition extends UmbConditionBase {
  constructor(host, args) {
    super(host, args);
    this.permitted = false;
    this._contentTypeAlias = null;

    this.consumeContext(UMB_AUTH_CONTEXT, (authContext) => {
      this._authContext = authContext;
      this._evaluate();
    });

    this.consumeContext(UMB_DOCUMENT_WORKSPACE_CONTEXT, (workspaceContext) => {
      if (!workspaceContext?.structure?.ownerContentType) return;
      this.observe(workspaceContext.structure.ownerContentType, (contentType) => {
        this._contentTypeAlias = contentType?.alias ?? null;
        this._evaluate();
      });
    });
  }

  async _evaluate() {
    if (!this._authContext || !this._contentTypeAlias) return;
    const productPageAliases = await fetchProductPageAliases(this._authContext);
    this.permitted = productPageAliases.includes(this._contentTypeAlias);
  }
}

export { EcommIsProductPageCondition as api };
